# syntax=docker/dockerfile:1
FROM caddy:2.10.2-alpine

# Update Alpine packages to latest security patches
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

LABEL org.opencontainers.image.source="https://github.com/nbslabs/difflense"
LABEL org.opencontainers.image.description="DiffLens static site served via Caddy"
LABEL org.opencontainers.image.licenses="MIT"

COPY ./assets /usr/share/caddy/assets
COPY ./index.html /usr/share/caddy/index.html
COPY ./about.html /usr/share/caddy/about.html
COPY ./contact.html /usr/share/caddy/contact.html
COPY ./contribute.html /usr/share/caddy/contribute.html
COPY ./diff-view.html /usr/share/caddy/diff-view.html