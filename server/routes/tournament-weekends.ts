import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { tournamentWeekendsGetRoute } from './tournament-weekends/get.ts';
import { tournamentWeekendsPostRoute } from './tournament-weekends/post.ts';
import { tournamentWeekendsLiveGetRoute } from './tournament-weekends/live/get.ts';
import { tournamentWeekendIdResourcesPostRoute } from './tournament-weekends/_id/resources/post.ts';
import { tournamentWeekendIdResourcesResourceIdPatchRoute } from './tournament-weekends/_id/resources/_resourceId/patch.ts';
import { tournamentWeekendIdTournamentGroupsPostRoute } from './tournament-weekends/_id/tournament-groups/post.ts';
import { tournamentWeekendIdTournamentGroupsDeleteRoute } from './tournament-weekends/_id/tournament-groups/delete.ts';
import { tournamentWeekendIdRefreshTournamentsPostRoute } from './tournament-weekends/_id/refresh-tournaments/post.ts';
import { tournamentWeekendIdCheckPostRoute } from './tournament-weekends/_id/check/post.ts';
import { tournamentWeekendIdGetRoute } from './tournament-weekends/_id/get.ts';
import { tournamentWeekendIdPatchRoute } from './tournament-weekends/_id/patch.ts';

export const tournamentWeekendsRoute = new Hono<AuthExtension>()
  .route('/', tournamentWeekendsGetRoute)
  .route('/', tournamentWeekendsPostRoute)
  .route('/live', tournamentWeekendsLiveGetRoute)
  .route('/:id/tournament-groups', tournamentWeekendIdTournamentGroupsPostRoute)
  .route('/:id/tournament-groups', tournamentWeekendIdTournamentGroupsDeleteRoute)
  .route('/:id/refresh-tournaments', tournamentWeekendIdRefreshTournamentsPostRoute)
  .route('/:id/check', tournamentWeekendIdCheckPostRoute)
  .route('/:id/resources/:resourceId', tournamentWeekendIdResourcesResourceIdPatchRoute)
  .route('/:id/resources', tournamentWeekendIdResourcesPostRoute)
  .route('/:id', tournamentWeekendIdPatchRoute)
  .route('/:id', tournamentWeekendIdGetRoute);
