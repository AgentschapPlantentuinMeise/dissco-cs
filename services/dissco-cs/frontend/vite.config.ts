import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Unique prefix so the gateway can route built asset requests (/cs-assets/*) to this
  // service specifically, without colliding with madoc-ts's own asset paths. Build-only: in
  // `vite dev` this would otherwise force every URL under /cs-assets/, breaking direct
  // navigation to /s/:slug/... during local dev.
  base: command === 'build' ? '/cs-assets/' : '/',
  build: {
    outDir: 'dist',
  },
  // @dissco-cs/shared-types is a local `file:` link, not a real published package -- Vite's dep
  // pre-bundler caches it by lockfile/package.json, not by its source content, so edits to it
  // (like a new export) silently serve a stale bundle until the dev server is force-restarted.
  // Excluding it makes Vite always read it fresh instead.
  optimizeDeps: {
    exclude: ['@dissco-cs/shared-types'],
  },
  server: {
    proxy: {
      // Our own dissco-cs-api, running locally via `pnpm dev` in backend/ (see backend/.env.local).
      // Straight to localhost:8000, not through the gateway -- the gateway's own
      // dissco-cs-api:8000 route resolves to the Docker container (the deployed path), which
      // is a different, unrelated process from this local dev server.
      '/api/dissco-cs': 'http://localhost:8000',
      // The only gated madoc-ts route the frontend still calls itself: acceptTerms
      // (src/api/madoc-auth), served by the gateway (nginx, see
      // services/gateway/conf.d/services/madoc-api.conf). Without this it would fall through to
      // Vite's own SPA fallback and silently get index.html back.
      '/api/madoc': 'http://localhost:8888',
      // madoc-ts's auth flows (src/api/madoc-auth/request.ts) go through the gateway at
      // /s/:slug/madoc/api/*. Page paths under /s/:slug/* (e.g. /s/:slug/manage) must stay
      // served by Vite itself so the SPA (and getSiteSlug()) still works when opening the app
      // directly at http://localhost:5173/s/:slug/... during local dev.
      '/s': {
        target: 'http://localhost:8888',
        bypass: req => {
          if (!req.url?.includes('/madoc/api')) {
            return req.url;
          }
        },
      },
    },
  },
}));
