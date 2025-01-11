import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { collectionRoute } from './routes/collection.ts';
import { serveStatic } from 'hono/bun';
import { authRoute } from './routes/auth.ts';

const app = new Hono();

app.use('*', logger());

const apiRoutes = app
  .basePath('/api')
  .route('/collection', collectionRoute)
  .route('/auth', authRoute);

app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
