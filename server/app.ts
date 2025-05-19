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
import { tournamentRoute } from './routes/tournament.ts';
import { entitiesRoute } from './routes/entity.ts';
import { metaRoute } from './routes/meta.ts';
import { cardStatsRoute } from './routes/card-stats.ts';
import { setRoute } from './routes/set.ts';
import { matchRouteAndFetchMetaTags } from './lib/utils/routeMatcher';
import { injectMetaTags } from './lib/utils/htmlTemplate';
import fs from 'fs';
import path from 'path';

const app = new Hono<AuthExtension>();

app.use('*', logger());
app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  c.set('user', session.user);
  c.set('session', session.session);
  return next();
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

const apiRoutes = app
  .basePath('/api')
  .route('/auth', authRoute)
  .route('/world', worldRoute)
  .route('/collection', collectionRoute)
  .route('/deck', deckRoute)
  .route('/cards', cardsRoute)
  .route('/user', userRoute)
  .route('/tournament', tournamentRoute)
  .route('/entities', entitiesRoute)
  .route('/meta', metaRoute)
  .route('/card-stats', cardStatsRoute)
  .route('/set', setRoute);

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
  console.log({ pathname });

  // Skip for API routes and static assets
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return next();
  }

  // Try to match the route and fetch meta tags
  const metaTags = await matchRouteAndFetchMetaTags(pathname, url.searchParams);

  // If no meta tags were found, continue to the next middleware
  if (!metaTags) {
    console.log('Skipping');
    return next();
  }

  // Inject meta tags into the HTML
  console.log({ metaTags });
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

export default app;
export type ApiRoutes = typeof apiRoutes;
