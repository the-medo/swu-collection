import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { applicationConfigurationGetRoute } from './application-configuration/get.ts';
import { applicationConfigurationPatchRoute } from './application-configuration/patch.ts';

export const applicationConfigurationRoute = new Hono<AuthExtension>()
  .route('/', applicationConfigurationGetRoute)
  .route('/', applicationConfigurationPatchRoute);
