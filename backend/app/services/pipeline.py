from typing import Dict, Any, List
from app.core.config import settings
from app.domain.schemas import Finding
from app.services.diff_fetcher import DiffFetcher
from app.services.rag_service import RagService
from app.services.llm_service import LlmService
from app.services.rule_engine import RuleEngine
from app.integrations.github.review_publisher import ReviewPublisher
from app.integrations.github.checks_publisher import ChecksPublisher
from app.utils.severity import get_max_severity, should_fail_gate
from app.utils.formatters import format_inline_comment, format_summary
from app.exceptions import PipelineError


def process_job_legacy(job) -> Dict[str, Any]:
    """
    DEPRECATED: Use PipelineOrchestrator instead.

    This legacy function kept for backward compatibility.
    """
    """
    Process a security review job.

    Args:
        job: Job object with PR details

    Returns:
        Dictionary with overall severity, failure status, and finding count

    Raises:
        PipelineError: If pipeline processing fails
    """
    try:
        files = DiffFetcher(job.github_token).fetch_files(job.owner, job.repo, job.pr_number)
    except Exception as e:
        raise PipelineError(f"Failed to fetch diff: {str(e)}", {"job_id": job.job_id})

    rag = RagService()
    llm = LlmService()
    rules = RuleEngine()

    findings: List[Finding] = []

    for file_item in files[: max(settings.max_llm_chunks, 1)]:
        path = file_item.get("filename")
        patch = file_item.get("patch")
        if not path or not patch:
            continue

        findings.extend(rules.analyze_patch(path, patch))

        # ✅ must be a single valid string (use \n)
        rag_query = f"{path}\n{patch[:1500]}"
        rag_text = rag.retrieve(query_text=rag_query)

        findings.extend(llm.review(chunk_text=patch, rag_text=rag_text))

    overall = get_max_severity(findings)
    should_fail = should_fail_gate(overall, settings.merge_gate_min_severity)

    # Build inline comments
    comments = []
    for finding in findings[: settings.max_inline_comments]:
        comments.append(
            {
                "path": finding.file_path,
                "body": format_inline_comment(finding),
                "line": max(finding.location.start_line, 1),
                "side": "RIGHT",
            }
        )

    # Build summary
    summary = format_summary(
        overall=overall,
        count=len(findings),
        should_fail=should_fail,
        threshold=settings.merge_gate_min_severity
    )

    pub = ReviewPublisher(job.github_token)
    try:
        pub.create_review(
            job.owner,
            job.repo,
            job.pr_number,
            commit_id=job.head_sha,
            body=summary,
            comments=comments,
        )
    except Exception:
        pub.post_issue_comment(job.owner, job.repo, job.pr_number, summary)
        for c in comments:
            try:
                pub.create_review_comment(
                    job.owner,
                    job.repo,
                    job.pr_number,
                    commit_id=job.head_sha,
                    path=c["path"],
                    line=c["line"],
                    body=c["body"],
                    side=c.get("side", "RIGHT"),
                )
            except Exception:
                continue

    # status reporting
    if settings.status_reporting_enabled:
        checks = ChecksPublisher(job.github_token)
        mode = (job.status_mode or settings.status_reporting_mode).lower()

        if mode == "check_run" and job.check_run_id:
            conclusion = "failure" if should_fail else "success"
            try:
                checks.update_check_run(
                    job.owner,
                    job.repo,
                    job.check_run_id,
                    conclusion=conclusion,
                    summary=summary,
                    details_url=settings.status_details_url,
                )
            except Exception:
                pass
        else:
            state = "failure" if should_fail else "success"
            try:
                checks.create_commit_status(
                    job.owner,
                    job.repo,
                    job.head_sha,
                    state=state,
                    context=settings.status_check_name,
                    description=f"SecurePR AI: {overall}",
                    target_url=settings.status_details_url,
                )
            except Exception:
                pass

    return {"overall": overall, "should_fail": should_fail, "count": len(findings)}