// Default placeholder — overwritten at container startup by
// deployment/docker/generate-env-config.sh, which reads the API_BASE_URL
// environment variable and regenerates this file before nginx starts.
// Leaving this empty means storage.ts falls back to VITE_API_BASE_URL
// (build-time) or '/api' (default), so local `vite dev`/`vite build`
// work unchanged without this file being generated.
window.__ENV__ = {};
