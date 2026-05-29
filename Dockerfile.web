# syntax=docker/dockerfile:1.6

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @ft/shared build
RUN pnpm --filter @ft/web build

FROM nginx:1.27-alpine AS runtime
ENV PORT=80
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Use nginx's template mechanism: files in /etc/nginx/templates/*.conf.template
# get envsubst'd into /etc/nginx/conf.d/*.conf at container start.
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
# Remove the stock nginx default that listens on :80 to avoid port conflicts when PORT=80.
RUN rm -f /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
