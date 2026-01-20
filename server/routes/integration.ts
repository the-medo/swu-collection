import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { linkCreatePostRoute } from './integration/link-create/post.ts';
import { linkConfirmPostRoute } from './integration/link-confirm/post.ts';
import { refreshTokenPostRoute } from './integration/refresh-token/post.ts';
import { unlinkPostRoute } from './integration/unlink/post.ts';

export const integrationRoute = new Hono<AuthExtension>()
  .route('/link-create', linkCreatePostRoute)
  .route('/link-confirm', linkConfirmPostRoute)
  .route('/refresh-token', refreshTokenPostRoute)
  .route('/unlink', unlinkPostRoute);
