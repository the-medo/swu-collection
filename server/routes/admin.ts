import { Hono } from 'hono';
import { updateDeckInformationPostRoute } from './admin/special-actions/update-deck-information/post.ts';
import { dailySnapshotPostRoute } from './admin/special-actions/daily-snapshot/post.ts';
import { checkDeletedVariantsGetRoute } from './admin/variant-checker/check-deleted-variants/get.ts';
import { replaceVariantPostRoute } from './admin/variant-checker/replace-variant/post.ts';
import { previewCardsGetRoute } from './admin/preview-cards/get.ts';
import { previewCardsPostRoute } from './admin/preview-cards/post.ts';
import { previewCardsIdPatchRoute } from './admin/preview-cards/_id/patch.ts';
import { previewCardsIdDeleteRoute } from './admin/preview-cards/_id/delete.ts';
import { previewCardsIdImagePostRoute } from './admin/preview-cards/_id/image/post.ts';
import { previewCardsIdMigratePostRoute } from './admin/preview-cards/_id/migrate/post.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const adminRoute = new Hono<AuthExtension>()
  .route('/special-actions/update-deck-information', updateDeckInformationPostRoute)
  .route('/special-actions/daily-snapshot', dailySnapshotPostRoute)
  .route('/variant-checker/check-deleted-variants', checkDeletedVariantsGetRoute)
  .route('/variant-checker/replace-variant', replaceVariantPostRoute)
  .route('/preview-cards', previewCardsGetRoute)
  .route('/preview-cards', previewCardsPostRoute)
  .route('/preview-cards/:id', previewCardsIdPatchRoute)
  .route('/preview-cards/:id', previewCardsIdDeleteRoute)
  .route('/preview-cards/:id/image', previewCardsIdImagePostRoute)
  .route('/preview-cards/:id/migrate', previewCardsIdMigratePostRoute);
