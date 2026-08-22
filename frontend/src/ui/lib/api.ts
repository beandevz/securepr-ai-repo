/**
 * Lightweight API helpers used by frontend pages.
 * All calls go through the configured apiBaseUrl from storage.
 */

/**
 * GET request that returns parsed JSON.
 */
export async function apiGet<T>(baseUrl: string, path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * POST request with JSON body, returns parsed JSON.
 * Supports optional extra headers (e.g. for HMAC signature).
 */
export async function apiPostJson<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * DELETE request, returns parsed JSON.
 * Error bodies from the API carry a `detail` field; prefer it over the raw
 * body so callers can show the server's reason instead of a bare status code.
 */
export async function apiDelete<T>(baseUrl: string, path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = text || res.statusText;
    try {
      detail = JSON.parse(text).detail || detail;
    } catch {
      // Not JSON - keep the raw body.
    }
    throw new Error(`DELETE ${path} failed: ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}
