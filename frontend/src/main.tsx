import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './styles/typography.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { ThemeProvider } from './components/theme-provider';
import { queryClient } from '@/queryClient.ts';
import { DatabaseProvider } from '@/providers/DatabaseProvider.tsx';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip.tsx';
import * as Sentry from '@sentry/react';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

Sentry.init({
  enabled: import.meta.env.VITE_ENVIRONMENT !== 'local',
  dsn: import.meta.env.VITE_SENTRY_FRONTEND_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] })],
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <DatabaseProvider>
          <HelmetProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </HelmetProvider>
        </DatabaseProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
