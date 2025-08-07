import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { userSettingsGetRoute } from './user-settings/get.ts';
import { userSettingsPostRoute } from './user-settings/post.ts';

export const userSettingsRoute = new Hono<AuthExtension>()
  .route('/', userSettingsGetRoute)
  .route('/', userSettingsPostRoute);