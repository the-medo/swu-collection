import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { collectionRoute } from './routes/collection.ts';
import { serveStatic } from 'hono/bun';
import { auth } from './auth/auth.ts';

const app = new Hono();

app.use('*', logger());

const apiRoutes = app.basePath('/api').route('/api/collection', collectionRoute);

app.on(['POST', 'GET'], '/api/auth/**', c => auth.handler(c.req.raw));
app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
