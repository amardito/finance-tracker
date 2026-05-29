# syntax=docker/dockerfile:1.6

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY tsconfig.json vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY public public
COPY src src
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
# Default PORT for local docker-compose; Railway overrides this at runtime.
ENV PORT=80
COPY --from=build /app/dist /usr/share/nginx/html
# Template gets envsubst'd into /etc/nginx/conf.d/*.conf at container start by nginx's official entrypoint.
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Drop stock default.conf so it doesn't shadow our template-generated one on port 80.
RUN rm -f /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
