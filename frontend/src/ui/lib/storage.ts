/**
 * Browser-side settings storage (localStorage).
 */

const STORAGE_KEY = 'securepr-settings';

export interface AppSettings {
  apiBaseUrl: string;
  ingestSecret: string;
  githubToken: string;
}

function getEnvDefaults(): AppSettings {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    ingestSecret: '',
    githubToken: '',
  };
}

/**
 * Load settings from localStorage, falling back to env/defaults.
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
