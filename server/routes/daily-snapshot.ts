import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { dailySnapshotGetRoute } from './daily-snapshot/get.ts';

export const dailySnapshotRoute = new Hono<AuthExtension>().route('/', dailySnapshotGetRoute);
