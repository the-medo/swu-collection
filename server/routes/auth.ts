import { Hono } from 'hono';
import { auth } from '../auth/auth.ts';
import { getAuthEmailConfig } from '../lib/auth-email/config.ts';

export const authRoute = new Hono()
  .get('/email-config', c => {
    c.header('Cache-Control', 'no-store');
    return c.json({ enabled: getAuthEmailConfig().enabled });
  })
  .get('*', c => auth.handler(c.req.raw))
  .post('*', c => auth.handler(c.req.raw));
