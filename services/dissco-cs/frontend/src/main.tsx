import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './global.css';
import { App } from './App';
import { queryClient } from './api/query-client';
import { listenForUncaughtErrors } from './api/uncaught-errors';
import { Toast } from './components/layout/Toast';
import { SiteThemeSync } from './components/layout/SiteThemeSync';
import { applySiteColors, readCachedSiteColors } from './utility/site-colors';

listenForUncaughtErrors();
applySiteColors(readCachedSiteColors());

const root = document.getElementById('app');
if (!root) {
  throw new Error('Could not find #app root element');
}

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toast />
    <SiteThemeSync />
  </QueryClientProvider>
);
