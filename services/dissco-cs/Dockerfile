FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS api-build
WORKDIR /app
RUN corepack enable
COPY api/package.json api/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY api/tsconfig.json ./
COPY api/src ./src
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/package.json ./package.json
COPY --from=frontend-build /frontend/dist ./frontend-dist
EXPOSE 8000
CMD ["node", "dist/index.js"]
