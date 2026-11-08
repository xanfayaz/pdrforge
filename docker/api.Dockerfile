FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
ENV DATABASE_URL=postgresql://pdrforge:pdrforge@postgres:5432/pdrforge?schema=public
RUN npm run build -w @pdrforge/shared && npm run build -w @pdrforge/api

COPY docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /repo/apps/api
ENV PORT=4000
EXPOSE 4000
CMD ["/entrypoint.sh"]
