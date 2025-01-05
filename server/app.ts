import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { collectionRoute } from './routes/collection.ts';

const app = new Hono();

app.use('*', logger());

app.get('/test', c => {
  return c.json({ message: 'test' });
});

app.route('/api/collection', collectionRoute);

export default app;
