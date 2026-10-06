import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './global.css';
import { App } from './App';
import { disscoCSConfig } from './dissco-cs-config';

document.title = disscoCSConfig.platformName;

const root = document.getElementById('app');
if (!root) {
  throw new Error('Could not find #app root element');
}

const queryClient = new QueryClient();

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
