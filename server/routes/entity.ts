import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { entitiesPostRoute } from './entities/post.ts';
import { entitiesIdGetRoute } from './entities/_id/get.ts';

export const entitiesRoute = new Hono<AuthExtension>()
  .route('/', entitiesPostRoute)
  .route('/:id', entitiesIdGetRoute);
