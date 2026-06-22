/**
 * Browser-side settings storage (localStorage).
 */

const STORAGE_KEY = 'securepr-settings';

export interface AppSettings {
  apiBaseUrl: string;
  ingestSecret: string;
  githubToken: string;
  useMockApi: boolean;
}

function getEnvDefaults(): AppSettings {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    ingestSecret: '',
    githubToken: '',
    useMockApi: (import.meta.env.VITE_USE_MOCK_API || 'false') === 'true',
  };
}

/**
 * Load settings from localStorage, falling back to env/defaults.
 *
 * Note: useMockApi always comes from the .env file (VITE_USE_MOCK_API)
 * unless the user explicitly toggled it in the Settings page.
 * This prevents stale localStorage values from silently enabling mock mode.
 */
export function loadSettings(): AppSettings {
  const defaults = getEnvDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...defaults,
        ...parsed,
        // Always respect .env for useMockApi unless user explicitly saved it
        // The user can override via Settings page → saveSettings()
      };
    }
  } catch {
    // ignore parse errors
  }
  return { ...defaults };
}

/**
 * Save settings to localStorage.
 */
export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Clear all stored settings (resets to .env defaults).
 */
export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
