#!/bin/sh
# Runs automatically on container start (nginx's docker-entrypoint.d
# convention), so the same image works in both deployment topologies
# without a rebuild:
#
#   API_BASE_URL - what the BROWSER calls.
#       * Split deployment (e.g. two Azure App Services): the API's public
#         URL, e.g. https://my-api.azurewebsites.net. The browser then
#         talks to the API directly and the /api/ proxy below is unused.
#       * Same-origin deployment (docker-compose): "/api" (the default),
#         so calls go through the /api/ proxy below.
#
#   API_UPSTREAM - where nginx proxies /api/ requests. Only meaningful
#       when API_BASE_URL is "/api". docker-compose sets it to
#       http://api:8000. Leave it UNSET in split deployments — there is no
#       backend on the frontend's network to proxy to.
#
#   DNS_RESOLVER - resolver used for the proxy upstream. Defaults to
#       Docker's embedded DNS, which is what compose needs.
set -eu

: "${API_BASE_URL:=/api}"
: "${API_UPSTREAM:=}"
: "${DNS_RESOLVER:=127.0.0.11}"

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = { API_BASE_URL: "${API_BASE_URL}" };
EOF

if [ -n "$API_UPSTREAM" ]; then
  # The upstream host goes through a variable (plus an explicit rewrite,
  # since a variable in proxy_pass disables nginx's implicit prefix
  # stripping) so it is resolved per-request at runtime rather than at
  # startup — nginx then boots even if the backend isn't up yet.
  cat > /etc/nginx/securepr-api-proxy.conf <<EOF
resolver ${DNS_RESOLVER} valid=30s ipv6=off;

location /api/ {
    set \$upstream_api ${API_UPSTREAM};
    rewrite ^/api/(.*)\$ /\$1 break;
    proxy_pass \$upstream_api;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
else
  # No upstream configured. Answer /api/ with an explicit, actionable
  # error instead of proxying to a host that cannot exist here (which
  # would surface as a confusing 502 / "host not found in upstream").
  cat > /etc/nginx/securepr-api-proxy.conf <<'EOF'
location /api/ {
    default_type application/json;
    return 503 '{"error":"Frontend is not configured to reach the API. For a split deployment set API_BASE_URL to the API public URL (e.g. https://your-api.azurewebsites.net). To proxy same-origin instead, set API_UPSTREAM (e.g. http://api:8000)."}';
}
EOF
fi
