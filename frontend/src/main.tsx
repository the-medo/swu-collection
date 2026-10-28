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
import { isSensitiveMcpUrl } from '@/lib/mcpPrivacy.ts';
import { isSensitiveAuthUrl } from '../../shared/auth.ts';

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
  beforeSendLog(log) {
    if (
      isSensitiveMcpUrl(window.location.href) ||
      isSensitiveAuthUrl(window.location.href) ||
      document.querySelector('[data-auth-private]') ||
      isSensitiveAuthUrl(JSON.stringify(log))
    )
      return null;
    return log;
  },
  beforeBreadcrumb(breadcrumb) {
    if (
      isSensitiveMcpUrl(window.location.href) ||
      [breadcrumb.data?.url, breadcrumb.data?.from, breadcrumb.data?.to].some(isSensitiveMcpUrl) ||
      isSensitiveAuthUrl(window.location.href) ||
      isSensitiveAuthUrl(JSON.stringify(breadcrumb))
    )
      return null;
    return breadcrumb;
  },
  beforeSend(event) {
    if (
      isSensitiveMcpUrl(window.location.href) ||
      isSensitiveMcpUrl(event.request?.url) ||
      isSensitiveAuthUrl(window.location.href) ||
      isSensitiveAuthUrl(event.request?.url)
    )
      return null;
    return event;
  },
  beforeSendTransaction(event) {
    if (
      isSensitiveMcpUrl(window.location.href) ||
      isSensitiveMcpUrl(event.request?.url) ||
      isSensitiveAuthUrl(window.location.href) ||
      isSensitiveAuthUrl(event.request?.url)
    )
      return null;
    return event;
  },
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
