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

exec node /app/dist/main.js
