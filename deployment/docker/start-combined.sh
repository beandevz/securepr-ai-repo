#!/bin/sh
# Entrypoint for the combined (nginx + API) image.
#
# nginx is started as a background daemon and the Node API runs in the
# foreground as PID 1, so if the API exits the container exits with it and
# the platform (App Service, compose, ...) restarts the whole thing. The
# reverse - nginx in the foreground - would leave a container that looks
# healthy while serving a dead backend.
set -e

nginx

# Pin the API to the internal port nginx proxies to. This is deliberately
# forced rather than defaulted: hosts inject their own PORT (App Service
# derives it from WEBSITES_PORT, which here is 80 - nginx's port), and
# main.ts honours PORT, so without this the API tries to bind the port
# nginx already holds and dies with EADDRINUSE.
export PORT=8000

exec node /app/dist/main.js
