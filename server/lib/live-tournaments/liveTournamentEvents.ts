import type { LiveTournamentCheckResult, LiveTournamentProgressCheckResult } from './types.ts';

export async function publishLiveTournamentChecked(_result: LiveTournamentCheckResult) {
  // TODO: Publish this through the live tournament websocket room once that route exists.
}

export async function publishLiveTournamentProgressChecked(
  _result: LiveTournamentProgressCheckResult,
) {
  // TODO: Publish standings/match updates through the live tournament websocket room.
}
