"""Severity comparison and ordering utilities."""
from typing import List, Any

# Severity ordering (higher number = more severe)
SEV_ORDER = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
}


def get_max_severity(findings: List[Any]) -> str:
    """
    Get the maximum severity from a list of findings.

    Args:
        findings: List of findings (must have .severity attribute)

    Returns:
        Maximum severity level as string
    """
    best = "LOW"
    for f in findings:
        severity = getattr(f, 'severity', 'LOW')
        if SEV_ORDER.get(severity, 0) > SEV_ORDER.get(best, 0):
            best = severity
    return best


def should_fail_gate(overall_severity: str, threshold_severity: str) -> bool:
    """
    Determine if merge gate should fail based on severity threshold.

    Args:
        overall_severity: Overall severity of findings
        threshold_severity: Minimum severity to fail gate

    Returns:
        True if should fail, False otherwise
    """
    return SEV_ORDER.get(overall_severity, 0) >= SEV_ORDER.get(threshold_severity, 0)


def sort_findings_by_severity(findings: List[Any], descending: bool = True) -> List[Any]:
    """
    Sort findings by severity.

    Args:
        findings: List of findings (must have .severity attribute)
        descending: If True, sort from highest to lowest severity

    Returns:
        Sorted list of findings
    """
    return sorted(
        findings,
        key=lambda f: SEV_ORDER.get(getattr(f, 'severity', 'LOW'), 0),
        reverse=descending
    )
