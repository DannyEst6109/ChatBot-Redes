# Builds and runs only the remote Supply Control MCP server (requirement 6).
# The terminal chatbot and the official Filesystem/Git servers are not part of
# this image; they keep running locally over stdio.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY test ./test
COPY web ./web
COPY vite.config.ts ./vite.config.ts
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-web ./dist-web
COPY data ./data

# Cloud Run sets PORT; the entry point falls back to 8080 otherwise.
CMD ["node", "--enable-source-maps", "dist/src/mcp/supply-server-http-entry.js"]
