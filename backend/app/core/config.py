from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    securepr_ingest_secret: str = 'change_me'
    github_token: str | None = None

    queue_provider: str = 'inproc'  # inproc|azure_servicebus
    inproc_queue_maxsize: int = 200
    servicebus_connection_string: str | None = None
    servicebus_queue_name: str = 'securepr'

    # LLM
    llm_provider: str = 'none'
    llm_temperature: float = 0.0
    max_llm_chunks: int = 5
    azure_openai_endpoint: str | None = None
    azure_openai_key: str | None = None
    azure_openai_deployment: str | None = None
    azure_openai_api_version: str = '2024-10-21'

    # RAG
    rag_enabled: bool = False
    rag_db_path: str = 'rag.db'
    rag_top_k: int = 4
    rag_chunk_size_chars: int = 1200
    azure_openai_embedding_deployment: str | None = None

    # Review
    max_inline_comments: int = 12

    # Status reporting
    status_reporting_enabled: bool = True
    status_reporting_mode: str = 'check_run'  # check_run|commit_status
    status_check_name: str = 'SecurePR AI'
    status_details_url: str | None = None

    # Gating
    merge_gate_min_severity: str = 'HIGH'

    class Config:
        env_prefix = ''
        env_file = '.env'
        extra = 'ignore'

settings = Settings()
