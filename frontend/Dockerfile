FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_BASE_URL is deliberately left unset — apiClient.ts's default
# ("/api") is exactly right for this image's own nginx.conf, which
# reverse-proxies /api same-origin to the backend container. Only ever
# set it at build time if this image is deployed somewhere that DOESN'T
# use this nginx.conf (e.g. a static host with the API on a different
# origin), which would also then need CORS configured backend-side.
RUN npm run build

# ---------------------------------------------------------------------

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 127.0.0.1, not localhost — this image's nginx.conf only declares an
# IPv4 `listen 80;` (no `listen [::]:80;`), but the container's
# /etc/hosts maps "localhost" to both 127.0.0.1 and ::1, and wget tries
# the IPv6 entry, gets a real connection-refused (nothing listening
# there), and fails the healthcheck even though nginx is actually up and
# serving fine. Confirmed the hard way against a running container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1
