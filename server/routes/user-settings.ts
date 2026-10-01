import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { userSettingsGetRoute } from './user-settings/get.ts';
import { userSettingsPostRoute } from './user-settings/post.ts';
import { userHomeLocationRoute } from './user-settings/home-location.ts';

export const userSettingsRoute = new Hono<AuthExtension>()
  .route('/home-location', userHomeLocationRoute)
  .route('/', userSettingsGetRoute)
  .route('/', userSettingsPostRoute);
