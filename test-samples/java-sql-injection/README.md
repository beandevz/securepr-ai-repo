# Java SQL Injection Test Samples

Intentionally vulnerable JDBC code used to exercise SecurePR AI's SQL injection
detection. Not a real application — do not deploy.

Note: `RuleBasedAnalyzer` (`backend/src/services/analyzers/rule-analyzer.ts`)
currently only pattern-matches hardcoded secrets, so these SQLi findings are
expected to come from `LlmAnalyzer` — an LLM provider must be configured
(`LLM_PROVIDER=openai` + `OPENAI_API_KEY`) for findings to be raised here.

## Files
- `UserDao.java` — login, lookup, search, and sort methods that concatenate
  untrusted input directly into SQL strings (`Statement` + string concat /
  `String.format` / `StringBuilder`).
- `ReportSqlBuilder.java` — dynamic table/where-clause construction from input,
  plus one safe `PreparedStatement` example for false-positive checking.

## Usage
Feed a diff touching these files (or the whole file) through the SecurePR AI
pipeline (`POST /ingest/github-actions` job, or paste into the RAG/analysis
tooling) and confirm findings are raised for each vulnerable method with
`OWASP A03:2021 – Injection` and a `PreparedStatement` remediation, and that
`findOrderById` is *not* flagged.
