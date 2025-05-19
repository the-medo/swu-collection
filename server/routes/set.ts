import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { setsThumbnailsPostRoute } from './sets/thumbnails/post.ts';

export const setRoute = new Hono<AuthExtension>()
  .route('/thumbnails', setsThumbnailsPostRoute);