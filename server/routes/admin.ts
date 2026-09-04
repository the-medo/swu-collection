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
import { previewCardsArchiveActivePostRoute } from './admin/preview-cards/archive-active/post.ts';
import { adminTournamentIdStandingsGetRoute } from './admin/tournaments/_id/standings/get.ts';
import { adminTournamentIdStandingPatchRoute } from './admin/tournaments/_id/standings/_deckId/patch.ts';
import { adminTournamentIdMatchesGetRoute } from './admin/tournaments/_id/matches/get.ts';
import { adminTournamentIdRoundApplyMatchesPostRoute } from './admin/tournaments/_id/rounds/_round/apply-matches/post.ts';
import { adminTournamentIdStandingMovePostRoute } from './admin/tournaments/_id/standings/_deckId/move/post.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const adminRoute = new Hono<AuthExtension>()
  .route('/special-actions/update-deck-information', updateDeckInformationPostRoute)
  .route('/special-actions/daily-snapshot', dailySnapshotPostRoute)
  .route('/variant-checker/check-deleted-variants', checkDeletedVariantsGetRoute)
  .route('/variant-checker/replace-variant', replaceVariantPostRoute)
  .route('/preview-cards', previewCardsGetRoute)
  .route('/preview-cards', previewCardsPostRoute)
  .route('/preview-cards/archive-active', previewCardsArchiveActivePostRoute)
  .route('/preview-cards/:id', previewCardsIdPatchRoute)
  .route('/preview-cards/:id', previewCardsIdDeleteRoute)
  .route('/preview-cards/:id/image', previewCardsIdImagePostRoute)
  .route('/preview-cards/:id/migrate', previewCardsIdMigratePostRoute)
  .route('/tournaments/:tournamentId/standings', adminTournamentIdStandingsGetRoute)
  .route('/tournaments/:tournamentId/standings/:deckId', adminTournamentIdStandingPatchRoute)
  .route(
    '/tournaments/:tournamentId/standings/:deckId/move',
    adminTournamentIdStandingMovePostRoute,
  )
  .route('/tournaments/:tournamentId/matches', adminTournamentIdMatchesGetRoute)
  .route(
    '/tournaments/:tournamentId/rounds/:round/apply-matches',
    adminTournamentIdRoundApplyMatchesPostRoute,
  );
