import { Hono } from 'hono';
import { updateDeckInformationPostRoute } from './admin/special-actions/update-deck-information/post.ts';
import { dailySnapshotPostRoute } from './admin/special-actions/daily-snapshot/post.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const adminRoute = new Hono<AuthExtension>()
  .route('/special-actions/update-deck-information', updateDeckInformationPostRoute)
  .route('/special-actions/daily-snapshot', dailySnapshotPostRoute);
