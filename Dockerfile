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
COPY --from=build /app/dist /usr/share/nginx/html
# Install our static nginx.conf, replacing the stock default that ships in the image.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
