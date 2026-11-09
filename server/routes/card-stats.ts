import { Hono } from 'hono';
import { cardStatsDeckCountsRoute } from './card-stats/deck-counts.ts';
import { cardStatsGetRoute } from './card-stats/get.ts';
import { cardStatsComputeRoute } from './card-stats/compute.ts';
import { cardStatsTopPlayedRoute } from './card-stats/top-played.ts';
import { cardStatsMatchupRoute } from './card-stats/matchup-stats.ts';
import { matchupStatDecksRoute } from './card-stats/matchup-stat-decks.ts';
import type { AuthExtension } from '../auth/auth.ts';

export const cardStatsRoute = new Hono<AuthExtension>()
  .route('/', cardStatsGetRoute)
  .route('/deck-counts', cardStatsDeckCountsRoute)
  .route('/compute', cardStatsComputeRoute)
  .route('/top-played', cardStatsTopPlayedRoute)
  .route('/matchup-stats', cardStatsMatchupRoute)
  .route('/matchup-stats/decks', matchupStatDecksRoute);
