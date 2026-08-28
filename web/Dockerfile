FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/data
WORKDIR /app
RUN useradd --create-home --uid 10001 printwatch && mkdir /data && chown printwatch:printwatch /data
COPY --from=build --chown=printwatch:printwatch /app/.next/standalone ./
COPY --from=build --chown=printwatch:printwatch /app/.next/static ./.next/static
USER printwatch
EXPOSE 3000
CMD ["node", "server.js"]
