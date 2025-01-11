import { Hono } from 'hono';
import { auth } from '../auth/auth.ts';

export const authRoute = new Hono()
  .get('*', c => auth.handler(c.req.raw))
  .post('*', c => auth.handler(c.req.raw));
