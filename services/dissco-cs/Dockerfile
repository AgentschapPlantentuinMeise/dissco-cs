FROM node:22.22.3-alpine AS shared-build
WORKDIR /build/shared
RUN npm install -g pnpm@9.15.9
COPY shared/ ./
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:22.22.3-alpine AS frontend-build
WORKDIR /build
RUN npm install -g pnpm@9.15.9
COPY --from=shared-build /build/shared ./shared/
COPY frontend/ ./frontend/
WORKDIR /build/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:22.22.3-alpine AS backend-build
WORKDIR /build
RUN npm install -g pnpm@9.15.9
COPY --from=shared-build /build/shared ./shared/
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
WORKDIR /build/backend
RUN pnpm install --frozen-lockfile
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22.22.3-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/dist ./dist
COPY --from=backend-build /build/backend/package.json ./package.json
COPY --from=frontend-build /build/frontend/dist ./frontend-dist
EXPOSE 8000
CMD ["node", "dist/index.js"]
