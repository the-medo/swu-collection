import { Hono } from 'hono';
import { entitiesPostRoute } from './entities/post.ts';
import { entitiesIdGetRoute } from './entities/_id/get.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const entitiesRoute = new Hono<AuthExtension>()
  .route('/', entitiesPostRoute)
  .route('/:id', entitiesIdGetRoute);
