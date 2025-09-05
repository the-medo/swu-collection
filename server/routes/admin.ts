import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { updateDeckInformationPostRoute } from './admin/special-actions/update-deck-information/post.ts';
import { dailySnapshotPostRoute } from './admin/special-actions/daily-snapshot/post.ts';

export const adminRoute = new Hono<AuthExtension>()
  .route('/special-actions/update-deck-information', updateDeckInformationPostRoute)
  .route('/special-actions/daily-snapshot', dailySnapshotPostRoute);