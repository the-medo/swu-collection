import type { MatchResult } from '../lib/MatchResult.ts';
import { getStatisticsTimestampMs } from '../lib/date.ts';
import { calculateResultStatistics } from '../lib/resultStatistics.ts';

// Internal team matches have two player perspectives, so they cannot describe team form.
export function completedHistoryMatches(matches: MatchResult[]) {
  return matches
    .filter(match => !match.inTeam && !match.exclude && match.result !== undefined)
    .sort(
      (a, b) =>
        getStatisticsTimestampMs(b.firstGameCreatedAt) -
        getStatisticsTimestampMs(a.firstGameCreatedAt),
    );
}

export function recentHistoryForm(matches: MatchResult[]) {
  const recent = completedHistoryMatches(matches).slice(0, 20).reverse();
  return {
    matches: recent,
    stats: calculateResultStatistics(recent),
    trend: recent.map((match, index) => {
      const window = recent.slice(Math.max(0, index - 9), index + 1);
      return { match, count: window.length, rate: calculateResultStatistics(window).matchWinrate };
    }),
  };
}

export function historyOpponents(matches: MatchResult[]) {
  const groups = new Map<string, MatchResult[]>();
  completedHistoryMatches(matches).forEach(match => {
    const key = match.opponentLeaderCardId ?? '';
    const group = groups.get(key) ?? [];
    group.push(match);
    groups.set(key, group);
  });
  return [...groups]
    .map(([leaderId, group]) => ({
      leaderId,
      stats: calculateResultStatistics(group),
    }))
    .sort(
      (a, b) => b.stats.totalMatches - a.stats.totalMatches || a.leaderId.localeCompare(b.leaderId),
    );
}
