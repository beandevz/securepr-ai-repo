import { settings } from '../core/settings.js';

/**
 * Builds the text used to retrieve policy context for a changed file.
 *
 * A raw patch is a poor retrieval query: unchanged context lines, deletions and
 * diff punctuation dominate the embedding, and truncating at a fixed offset
 * silently ignores the rest of a long file. These helpers keep the parts that
 * describe what the PR actually introduces.
 */

/** Retrieving per hunk costs one embedding call each; cap the fan-out per file. */
const MAX_QUERIES_PER_FILE = 4;

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
  py: 'Python', rb: 'Ruby', php: 'PHP', java: 'Java', kt: 'Kotlin', go: 'Go',
  cs: 'C#', c: 'C', h: 'C', cpp: 'C++', hpp: 'C++', rs: 'Rust', scala: 'Scala',
  sql: 'SQL', sh: 'Shell', bash: 'Shell', ps1: 'PowerShell',
  yml: 'YAML', yaml: 'YAML', json: 'JSON', tf: 'Terraform', dockerfile: 'Dockerfile',
};

/**
 * Security-relevant vocabulary. Naming the concepts a hunk touches pulls the
 * query toward policy sections about those concepts rather than toward
 * documents that merely share the file's boilerplate.
 */
const SECURITY_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(select|insert|update|delete|where|query|cursor|execute|prepare)\b/i, 'sql database query'],
  [/\b(exec|spawn|system|popen|shell|subprocess)\b/i, 'command execution'],
  [/\b(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key)\b/i, 'secret credential handling'],
  [/\b(auth|login|session|jwt|oauth|permission|role|acl|authorize)\b/i, 'authentication authorization access control'],
  [/\b(fetch|axios|request|http|https|url|webhook|curl)\b/i, 'outbound http request ssrf'],
  [/\b(innerhtml|dangerouslysetinnerhtml|document\.write|eval|new function)\b/i, 'xss code injection'],
  [/\b(redirect|location\.href|sendfile|readfile|path\.join|\.\.\/)\b/i, 'redirect path traversal file access'],
  [/\b(upload|multipart|formdata|filename)\b/i, 'file upload validation'],
  [/\b(crypto|cipher|hash|md5|sha1|random|encrypt|decrypt)\b/i, 'cryptography'],
  [/\b(cors|helmet|csrf|samesite|cookie|header)\b/i, 'http security headers cookies'],
  [/\b(log|logger|console\.(log|error)|print)\b/i, 'logging sensitive data'],
  [/\b(deserialize|pickle|yaml\.load|unmarshal|parse)\b/i, 'deserialization input parsing'],
];

function languageOf(filePath: string): string | undefined {
  const base = filePath.split('/').pop()?.toLowerCase() || '';
  if (base.startsWith('dockerfile')) return 'Dockerfile';
  const ext = base.includes('.') ? base.split('.').pop()! : '';
  return LANGUAGE_BY_EXT[ext];
}

/** Split a unified diff into hunks; text before the first @@ header is dropped. */
function splitHunks(patch: string): string[] {
  const hunks: string[] = [];
  let current: string[] | null = null;

  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current.join('\n'));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) hunks.push(current.join('\n'));

  return hunks.length > 0 ? hunks : [patch];
}

/** Lines the PR introduces, with the diff marker stripped. */
function addedLines(hunk: string): string {
  return hunk
    .split('\n')
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1).trim())
    .filter(Boolean)
    .join('\n');
}

function keywordsFor(text: string): string {
  const topics = SECURITY_KEYWORDS.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic);
  return [...new Set(topics)].join(' ');
}

function composeQuery(filePath: string, body: string): string {
  const language = languageOf(filePath);
  const header = language ? `${filePath} (${language})` : filePath;
  const keywords = keywordsFor(body);

  const query = [header, keywords, body].filter(Boolean).join('\n');
  return query.length > settings.ragQueryMaxChars
    ? query.slice(0, settings.ragQueryMaxChars)
    : query;
}

/**
 * Build one retrieval query per file, or one per hunk when the added code is
 * too large to fit a single query without truncation.
 */
export function buildRagQueries(filePath: string, patch: string): string[] {
  const hunks = splitHunks(patch);
  const added = hunks.map(addedLines).filter(Boolean);

  // Deletion-only or unparseable patch: fall back to the raw diff text.
  if (added.length === 0) {
    return [composeQuery(filePath, patch.trim())];
  }

  const combined = added.join('\n');
  if (combined.length <= settings.ragQueryMaxChars) {
    return [composeQuery(filePath, combined)];
  }

  return added.slice(0, MAX_QUERIES_PER_FILE).map(body => composeQuery(filePath, body));
}
