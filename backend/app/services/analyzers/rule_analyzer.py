"""Rule-based analyzer using pattern matching."""
import re
from typing import List
from app.domain.schemas import Finding, Evidence, Location


class RuleBasedAnalyzer:
    """Deterministic rule-based security analyzer."""

    SECRET_PATTERNS = [
        re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}['\"]"),
        re.compile(r"(?i)-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----"),
    ]

    def analyze(self, file_path: str, content: str) -> List[Finding]:
        """Analyze code using regex patterns."""
        findings: List[Finding] = []

        for pattern in self.SECRET_PATTERNS:
            match = pattern.search(content)
            if match:
                findings.append(Finding(
                    title='Possible hardcoded secret',
                    severity='HIGH',
                    owasp_top10_2025='A02',
                    confidence='MEDIUM',
                    file_path=file_path,
                    location=Location(start_line=1, end_line=1),
                    evidence=[Evidence(line=1, code=match.group(0)[:200])],
                    risk='Hardcoded secrets can lead to unauthorized access if leaked.',
                    recommendation='Remove secret from code; use secret manager/env vars and rotate keys.',
                    references=['OWASP Top 10:2025'],
                ))

        return findings

    def get_name(self) -> str:
        return "RuleBasedAnalyzer"
