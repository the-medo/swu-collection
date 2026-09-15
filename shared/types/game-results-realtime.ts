export type GameResultsScope =
  | { userId: string; teamId?: never }
  | { teamId: string; userId?: never };
export type GameResultsChanged = { type: 'game_results.changed'; scope: GameResultsScope };
