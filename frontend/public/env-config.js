// Default placeholder. In the split (two-container) deployment this is
// overwritten at container startup by
// deployment/docker/configure-runtime.sh, which reads the API_BASE_URL
// environment variable. Left empty, storage.ts falls back to '/api',
// which is what the combined single-container image and `vite dev` use.
window.__ENV__ = {};
