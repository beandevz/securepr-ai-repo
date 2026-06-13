from pydantic import BaseModel, Field
from typing import List

class Evidence(BaseModel):
    line: int
    code: str

class Location(BaseModel):
    start_line: int
    end_line: int

class Finding(BaseModel):
    title: str
    severity: str = Field(pattern=r'^(LOW|MEDIUM|HIGH|CRITICAL)$')
    owasp_top10_2025: str = Field(pattern=r'^(A01|A02|A03|A04|A05|A06|A07|A08|A09|A10)$')
    confidence: str = Field(pattern=r'^(LOW|MEDIUM|HIGH)$')
    file_path: str
    location: Location
    evidence: List[Evidence]
    risk: str
    recommendation: str
    safe_fix_example: str = ''
    references: List[str] = []
