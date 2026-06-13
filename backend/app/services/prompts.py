SYSTEM_PROMPT = (
    "You are SecurePR AI, a defensive security code reviewer in CI/CD. "
    "Do NOT provide exploit steps. Return JSON only."
)

CHUNK_PROMPT_TEMPLATE = (
    "RAG_CONTEXT:\n{rag}\n\n"
    "DIFF_CHUNK:\n{chunk}\n\n"
    'Return JSON: {"version":"1.0", "findings":[...], '
    '"summary":{"overall_risk":"LOW|MEDIUM|HIGH|CRITICAL", "top_actions":[...]}}'
)