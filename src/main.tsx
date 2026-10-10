import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient.ts';
import App from './App.tsx';
import './index.css';

// Automatically recover from stale Vite optimize cache or chunk mismatch
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    window.location.reload();
  });
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Outdated Optimize Dep') ||
      (event.message?.includes('useState') && event.message?.includes('reading'))
    ) {
      const lastReload = sessionStorage.getItem('last_cache_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('last_cache_reload', now.toString());
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

