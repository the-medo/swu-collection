import { Hono } from 'hono';
import { setsThumbnailsPostRoute } from './sets/thumbnails/post.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const setRoute = new Hono<AuthExtension>().route('/thumbnails', setsThumbnailsPostRoute);
