import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { dailySnapshotPostRoute } from './daily-snapshot/post.ts';

export const dailySnapshotRoute = new Hono<AuthExtension>().route('/', dailySnapshotPostRoute);
