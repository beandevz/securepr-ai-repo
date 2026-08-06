import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Settings {
  securePrIngestSecret: string;
  githubToken: string | undefined;

  queueProvider: string;
  inprocQueueMaxsize: number;
  servicebusConnectionString: string | undefined;
  servicebusQueueName: string;

  llmProvider: string;
  llmTemperature: number;
  maxLlmChunks: number;
  openaiApiKey: string | undefined;
  openaiBaseUrl: string | undefined;
  openaiModel: string | undefined;

  ragEnabled: boolean;
  ragDbPath: string;
  ragTopK: number;
  ragChunkSizeChars: number;
  ragChunkOverlapChars: number;
  openaiEmbeddingModel: string | undefined;

  maxInlineComments: number;

  tokenEncryptionKey: string;
  publicBaseUrl: string | undefined;
  reposDbPath: string;

  statusReportingEnabled: boolean;
  statusReportingMode: string;
  statusCheckName: string;
  statusDetailsUrl: string | undefined;

  mergeGateMinSeverity: string;
}

function loadSettings(): Settings {
  const env = process.env;
  return {
    securePrIngestSecret: env.SECUREPR_INGEST_SECRET || 'change_me',
    githubToken: env.GITHUB_TOKEN || undefined,

    queueProvider: env.QUEUE_PROVIDER || 'inproc',
    inprocQueueMaxsize: parseInt(env.INPROC_QUEUE_MAXSIZE || '200', 10),
    servicebusConnectionString: env.SERVICEBUS_CONNECTION_STRING || undefined,
    servicebusQueueName: env.SERVICEBUS_QUEUE_NAME || 'securepr',

    llmProvider: env.LLM_PROVIDER || 'none',
    llmTemperature: parseFloat(env.LLM_TEMPERATURE || '0'),
    maxLlmChunks: parseInt(env.MAX_LLM_CHUNKS || '5', 10),
    openaiApiKey: env.OPENAI_API_KEY || undefined,
    openaiBaseUrl: env.OPENAI_BASE_URL || undefined,
    openaiModel: env.OPENAI_MODEL || undefined,

    ragEnabled: (env.RAG_ENABLED || 'false').toLowerCase() === 'true',
    ragDbPath: env.RAG_DB_PATH || 'rag.db',
    ragTopK: parseInt(env.RAG_TOP_K || '4', 10),
    ragChunkSizeChars: parseInt(env.RAG_CHUNK_SIZE_CHARS || '1200', 10),
    ragChunkOverlapChars: parseInt(env.RAG_CHUNK_OVERLAP_CHARS || '200', 10),
    openaiEmbeddingModel: env.OPENAI_EMBEDDING_MODEL || undefined,

    maxInlineComments: parseInt(env.MAX_INLINE_COMMENTS || '12', 10),

    tokenEncryptionKey: env.TOKEN_ENCRYPTION_KEY || 'change_me',
    publicBaseUrl: env.PUBLIC_BASE_URL || undefined,
    reposDbPath: env.REPOS_DB_PATH || 'repos.db',

    statusReportingEnabled: (env.STATUS_REPORTING_ENABLED || 'true').toLowerCase() === 'true',
    statusReportingMode: env.STATUS_REPORTING_MODE || 'check_run',
    statusCheckName: env.STATUS_CHECK_NAME || 'SecurePR AI',
    statusDetailsUrl: env.STATUS_DETAILS_URL || undefined,

    mergeGateMinSeverity: env.MERGE_GATE_MIN_SEVERITY || 'HIGH',
  };
}

let _settings: Settings | null = null;

export function getSettings(): Settings {
  if (!_settings) {
    _settings = loadSettings();
  }
  return _settings;
}

export const settings = getSettings();
