"""Formatting utilities for PR comments and summaries."""
from typing import Any


def format_inline_comment(finding: Any) -> str:
    """
    Format a finding as an inline PR comment body.

    Args:
        finding: Finding object with severity, title, risk, recommendation

    Returns:
        Formatted markdown comment
    """
    severity = getattr(finding, 'severity', 'MEDIUM')
    owasp = getattr(finding, 'owasp_top10_2025', 'N/A')
    title = getattr(finding, 'title', 'Security Issue')
    risk = getattr(finding, 'risk', 'Unknown risk')
    recommendation = getattr(finding, 'recommendation', 'Review and fix')

    return (
        f"**{severity}** `{owasp}` {title}\n\n"
        f"**Risk:** {risk}\n\n"
        f"**Recommendation:** {recommendation}"
    )


def format_summary(
    overall: str,
    count: int,
    should_fail: bool,
    threshold: str
) -> str:
    """
    Format a summary comment for PR review.

    Args:
        overall: Overall severity
        count: Number of findings
        should_fail: Whether merge gate should fail
        threshold: Severity threshold for gate

    Returns:
        Formatted markdown summary
    """
    gate_status = 'FAIL' if should_fail else 'PASS'

    return (
        "## SecurePR AI Review\n\n"
        f"Overall: **{overall}**\n"
        f"Findings: **{count}**\n"
        f"Merge gate: **{gate_status}** "
        f"(threshold={threshold})\n"
    )
