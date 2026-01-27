import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { collectionRoute } from './routes/collection.ts';
import { deckRoute } from './routes/deck.ts';
import { serveStatic } from 'hono/bun';
import { authRoute } from './routes/auth.ts';
import { auth, type AuthExtension } from './auth/auth.ts';
import { cardsRoute } from './routes/cards.ts';
import { worldRoute } from './routes/world.ts';
import { userRoute } from './routes/user.ts';
import { userSettingsRoute } from './routes/user-settings.ts';
import { tournamentRoute } from './routes/tournament.ts';
import { tournamentGroupsRoute } from './routes/tournament-groups.ts';
import { entitiesRoute } from './routes/entity.ts';
import { metaRoute } from './routes/meta.ts';
import { cardStatsRoute } from './routes/card-stats.ts';
import { setRoute } from './routes/set.ts';
import { adminRoute } from './routes/admin.ts';
import { cardPricesRoute } from './routes/card-prices.ts';
import { cardPoolsRoute } from './routes/card-pools.ts';
import { dailySnapshotRoute } from './routes/daily-snapshot.ts';
import { integrationRoute } from './routes/integration.ts';
import { gameResultRoute } from './routes/game-results.ts';
import { matchRouteAndFetchMetaTags } from './lib/utils/routeMatcher';
import { injectMetaTags } from './lib/utils/htmlTemplate';
import { timeout } from 'hono/timeout';
import fs from 'fs';
import path from 'path';
import * as Sentry from '@sentry/bun';

Sentry.init({
  environment: process.env.ENVIRONMENT,
  dsn: process.env.SENTRY_BACKEND_DSN,
  tracesSampleRate: 1.0,
  enableLogs: process.env.ENVIRONMENT !== 'local',
  integrations: [
    Sentry.honoIntegration(),
    Sentry.requestDataIntegration(),
    Sentry.httpIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],
});

const app = new Hono<AuthExtension>().onError((err, c) => {
  Sentry.withScope(scope => {
    scope.setTransactionName((c.req as any).routePath || c.req.path);
    const user = c.get('user');
    if (user) scope.setUser({ id: user.id, email: user.email });
  });
  Sentry.captureException(err);
  return c.json({ message: 'Internal Server Error' }, 500);
});

app.use('*', logger());
app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  if (session.user) {
    Sentry.setUser({
      id: session.user.id,
      email: session.user.email,
    });
  }

  c.set('user', session.user);
  c.set('session', session.session);
  return next();
});

app.use('*', async (c, next) => {
  await next();
  if (c.res.status >= 500) {
    Sentry.captureMessage(`${c.res.status}: ${c.req.method} ${c.req.path} `, 'error');
  }
});

// Block common sensitive files pattern
app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  const blockedPatterns = [
    /\/\.env(\.[a-zA-Z0-9]+)?$/, // .env files
    /\/\.git\/.*/, // Git configs
    /\/\.aws\/.*/, // AWS credentials
    /\/config\.(json|ya?ml|py)$/, // Config files
    /\/(config|secrets)\/.*\.(json|ya?ml)$/, // Config directories
    /\/phpinfo$/, // PHP info
    /\/(wp-content|wp-admin)\/.*/, // WordPress paths
  ];

  if (blockedPatterns.some(pattern => pattern.test(path))) {
    return c.text('Not Found', 404);
  }
  return next();
});

app.use('/api/admin/special-actions/update-deck-information', timeout(180000));
app.use('/api/tournament/:id/export-to-blob', timeout(180000));

const apiRoutes = app
  .basePath('/api')
  .route('/auth', authRoute)
  .route('/world', worldRoute)
  .route('/collection', collectionRoute)
  .route('/deck', deckRoute)
  .route('/cards', cardsRoute)
  .route('/user', userRoute)
  .route('/user-settings', userSettingsRoute)
  .route('/tournament', tournamentRoute)
  .route('/tournament-groups', tournamentGroupsRoute)
  .route('/entities', entitiesRoute)
  .route('/meta', metaRoute)
  .route('/card-stats', cardStatsRoute)
  .route('/set', setRoute)
  .route('/admin', adminRoute)
  .route('/card-prices', cardPricesRoute)
  .route('/card-pools', cardPoolsRoute)
  .route('/daily-snapshot', dailySnapshotRoute)
  .route('/integration', integrationRoute)
  .route('/game-results', gameResultRoute);

// Read the index.html template once at startup
let indexHtml: string;
try {
  // Try to read from the production build directory first
  const indexHtmlPath = path.join(process.cwd(), 'frontend', 'dist', 'index.html');
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
} catch (error) {
  // If the file doesn't exist (in development), use the source index.html
  try {
    const devIndexHtmlPath = path.join(process.cwd(), 'frontend', 'index.html');
    indexHtml = fs.readFileSync(devIndexHtmlPath, 'utf-8');
    console.log('Using development index.html for SSR');
  } catch (fallbackError) {
    console.error('Could not find index.html in either dist or frontend directory', fallbackError);
    // Provide a minimal fallback HTML template
    indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SWU Base</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }
}

// Add SSR middleware for meta tags
app.get('*', async (c, next) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;

  // Skip for API routes and static assets
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return next();
  }

  // Try to match the route and fetch meta tags
  const metaTags = await matchRouteAndFetchMetaTags(pathname, url.searchParams);

  // If no meta tags were found, continue to the next middleware
  if (!metaTags) {
    return next();
  }

  // Inject meta tags into the HTML
  const modifiedHtml = await injectMetaTags(indexHtml, metaTags);

  // Return the modified HTML
  return c.html(modifiedHtml);
});

// Try to serve static files from dist directory first (production)
app.get('*', async (c, next) => {
  try {
    return await serveStatic({ root: './frontend/dist' })(c);
  } catch (error) {
    // If file not found in dist, continue to next middleware
    return next();
  }
});

// In development, try to serve from the frontend source directory
app.get('*', async (c, next) => {
  // Skip for API routes
  const url = new URL(c.req.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/api')) {
    return next();
  }

  // Only try to serve files with extensions (not routes)
  if (pathname.includes('.')) {
    try {
      return await serveStatic({ root: './frontend' })(c);
    } catch (error) {
      // If file not found, continue to next middleware
      return next();
    }
  }

  return next();
});

// Fallback to serving index.html for all other routes
app.get('*', c => c.html(indexHtml));

Sentry.setupHonoErrorHandler(app);

export default app;
export type ApiRoutes = typeof apiRoutes;
