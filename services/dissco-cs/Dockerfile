FROM node:22.22.3-alpine AS frontend-build
WORKDIR /build
RUN npm install -g pnpm@9.15.9
COPY shared/ ./shared/
COPY frontend/ ./frontend/
WORKDIR /build/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:22.22.3-alpine AS api-build
WORKDIR /build
RUN npm install -g pnpm@9.15.9
COPY shared/ ./shared/
COPY api/package.json api/pnpm-lock.yaml ./api/
WORKDIR /build/api
RUN pnpm install --frozen-lockfile
COPY api/tsconfig.json ./
COPY api/src ./src
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22.22.3-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
COPY --from=api-build /build/api/node_modules ./node_modules
COPY --from=api-build /build/api/dist ./dist
COPY --from=api-build /build/api/package.json ./package.json
COPY --from=frontend-build /build/frontend/dist ./frontend-dist
EXPOSE 8000
CMD ["node", "dist/index.js"]
