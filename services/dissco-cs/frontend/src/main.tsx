import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './global.css';
import { App } from './App';
import { disscoCSConfig } from './dissco-cs-config';
import { queryClient } from './api/query-client';
import { Toast } from './components/ui/Toast';

document.title = disscoCSConfig.platformName;

const root = document.getElementById('app');
if (!root) {
  throw new Error('Could not find #app root element');
}

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toast />
  </QueryClientProvider>
);
