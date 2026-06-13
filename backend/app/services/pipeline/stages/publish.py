"""Stage 4: Publish results to GitHub."""
from app.services.pipeline.base import PipelineContext
from app.integrations.github.review_publisher import ReviewPublisher
from app.integrations.github.checks_publisher import ChecksPublisher
from app.utils.formatters import format_inline_comment, format_summary
from app.core.config import settings


class PublishStage:
    """Publish findings to GitHub PR."""

    def execute(self, context: PipelineContext) -> PipelineContext:
        """Publish inline comments and summary."""
        # Build inline comments
        comments = []
        for finding in context.findings[:settings.max_inline_comments]:
            comments.append({
                "path": finding.file_path,
                "body": format_inline_comment(finding),
                "line": max(finding.location.start_line, 1),
                "side": "RIGHT",
            })

        # Build summary
        summary = format_summary(
            overall=context.overall_severity,
            count=len(context.findings),
            should_fail=context.should_fail,
            threshold=settings.merge_gate_min_severity
        )

        # Publish review
        publisher = ReviewPublisher(context.job.github_token)
        try:
            publisher.create_review(
                context.job.owner,
                context.job.repo,
                context.job.pr_number,
                commit_id=context.job.head_sha,
                body=summary,
                comments=comments,
            )
        except Exception:
            # Fallback: post as issue comment + individual review comments
            publisher.post_issue_comment(
                context.job.owner,
                context.job.repo,
                context.job.pr_number,
                summary
            )
            for comment in comments:
                try:
                    publisher.create_review_comment(
                        context.job.owner,
                        context.job.repo,
                        context.job.pr_number,
                        commit_id=context.job.head_sha,
                        path=comment["path"],
                        line=comment["line"],
                        body=comment["body"],
                        side=comment.get("side", "RIGHT"),
                    )
                except Exception:
                    continue

        # Update status check/run
        if settings.status_reporting_enabled:
            self._update_status(context)

        return context

    def _update_status(self, context: PipelineContext) -> None:
        """Update GitHub check run or commit status."""
        checks = ChecksPublisher(context.job.github_token)
        mode = (context.job.status_mode or settings.status_reporting_mode).lower()

        conclusion = "failure" if context.should_fail else "success"
        summary = format_summary(
            overall=context.overall_severity,
            count=len(context.findings),
            should_fail=context.should_fail,
            threshold=settings.merge_gate_min_severity
        )

        try:
            if mode == "check_run" and context.job.check_run_id:
                checks.update_check_run(
                    context.job.owner,
                    context.job.repo,
                    context.job.check_run_id,
                    conclusion=conclusion,
                    summary=summary,
                    details_url=settings.status_details_url,
                )
            else:
                state = "failure" if context.should_fail else "success"
                checks.create_commit_status(
                    context.job.owner,
                    context.job.repo,
                    context.job.head_sha,
                    state=state,
                    context=settings.status_check_name,
                    description=f"SecurePR AI: {context.overall_severity}",
                    target_url=settings.status_details_url,
                )
        except Exception:
            pass

    def get_name(self) -> str:
        return "PublishStage"
