import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { userSetupGetRoute } from './user-setup/get.ts';

export const userSetupRoute = new Hono<AuthExtension>().route('/', userSetupGetRoute);
