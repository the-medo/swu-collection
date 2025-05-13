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
  .route('/card-stats', cardStatsRoute);

app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
