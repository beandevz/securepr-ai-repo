import re
from typing import List
from app.domain.schemas import Finding, Evidence, Location

class RuleEngine:
    SECRET_PATTERNS = [
        re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}['\"]"),
        re.compile(r"(?i)-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----"),
    ]

    def analyze_patch(self, path: str, patch: str) -> List[Finding]:
        out: List[Finding] = []
        for pat in self.SECRET_PATTERNS:
            m = pat.search(patch)
            if m:
                out.append(Finding(
                    title='Possible hardcoded secret',
                    severity='HIGH',
                    owasp_top10_2025='A02',
                    confidence='MEDIUM',
                    file_path=path,
                    location=Location(start_line=1, end_line=1),
                    evidence=[Evidence(line=1, code=m.group(0)[:200])],
                    risk='Hardcoded secrets can lead to unauthorized access if leaked.',
                    recommendation='Remove secret from code; use secret manager/env vars and rotate keys.',
                    references=['OWASP Top 10:2025'],
                ))
        return out
