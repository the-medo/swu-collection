import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { collectionRoute } from './routes/collection.ts';
import { serveStatic } from 'hono/bun';
import { authRoute } from './routes/auth.ts';
import { auth, type AuthExtension } from './auth/auth.ts';

const app = new Hono<AuthExtension>();

app.use('*', logger()).use('*', async (c, next) => {
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

const apiRoutes = app
  .basePath('/api')
  .route('/collection', collectionRoute)
  .route('/auth', authRoute);

app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
