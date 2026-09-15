/** Account-scoped summaries only. No instance IDs, deck order or opposing private metrics. */
export type CrossfireRoundMetrics = {
  actions: number;
  attacks: number;
  played: number;
  activated: number;
  drawn: number;
  discarded: number;
  resourced: number;
  playResourcesSpent: number;
};
export type CrossfireMatchStatistics = {
  bestOf: 1 | 3;
  status: 'in-progress' | 'complete' | 'abandoned';
  outcome: 'win' | 'loss' | 'draw' | null;
  reason: 'score' | 'forfeit' | 'abandoned' | null;
  wins: number;
  losses: number;
};
export type CrossfireGameStatistics = {
  version: 1;
  lobbyId: string;
  match: CrossfireMatchStatistics;
  totals: CrossfireRoundMetrics;
  resumed: boolean;
};
