export const aprStageValues = ['field-top8', 'top8-champions', 'field-day2', 'day2-top8'] as const;

export type AprStage = (typeof aprStageValues)[number];

export const aprMetricValues = [
  'combined',
  'field-day2',
  'field-top8',
  'day2-top8',
  'top8-champions',
] as const;
export type AprMetric = (typeof aprMetricValues)[number];

export const aprStages: Record<AprStage, { label: string; from: string; to: string }> = {
  'field-top8': { label: 'Field → Top 8', from: 'Field', to: 'Top 8' },
  'top8-champions': { label: 'Top 8 → Champion', from: 'Top 8', to: 'Champions' },
  'field-day2': { label: 'Field → Day 2', from: 'Field', to: 'Day 2' },
  'day2-top8': { label: 'Day 2 → Top 8', from: 'Day 2', to: 'Top 8' },
};

export const aprMetrics = {
  ...aprStages,
  combined: { label: 'Combined APR', from: 'Field', to: 'Top 8' },
};

export type AprTournaments = Record<
  string,
  { tournament: { days: number; dayTwoPlayerCount: number | null; attendance?: number } }
>;

export interface AprEntry {
  tournamentId: string;
  placement: number | null;
  keys: readonly string[];
}

export interface AprDataItem {
  key: string;
  count: number;
  advanced: number;
  startShare: number;
  endShare: number;
  performanceRate: number;
  apr: number;
}

// APR: ((end share / start share) - 1) × log(n + 1) / log(N + 1).
// Values are percentages, calculated from unrounded counts. No observations ≠ 0% APR.
export function calculateApr(
  count: number,
  advanced: number,
  startTotal: number,
  endTotal: number,
) {
  if (
    ![count, advanced, startTotal, endTotal].every(Number.isSafeInteger) ||
    count <= 0 ||
    advanced < 0 ||
    startTotal <= 0 ||
    endTotal <= 0 ||
    count > startTotal ||
    advanced > count ||
    advanced > endTotal ||
    endTotal > startTotal
  ) {
    return null;
  }

  const startShare = count / startTotal;
  const endShare = advanced / endTotal;
  const performanceRate = (endShare / startShare - 1) * 100;
  return {
    startShare: startShare * 100,
    endShare: endShare * 100,
    performanceRate,
    apr: performanceRate * (Math.log1p(count) / Math.log1p(startTotal)),
  };
}

interface AprPopulation {
  total: number;
  counts: Map<string, number>;
}

interface PreparedTournament {
  id: string;
  tournament: AprTournaments[string]['tournament'] | undefined;
  unranked: number;
  field: AprPopulation;
  day2: AprPopulation;
  top8: AprPopulation;
  champions: AprPopulation;
}

/** Validate placements, deduplicate keys and count each population once for all comparisons. */
function prepareAprTournaments(entries: readonly AprEntry[], tournaments: AprTournaments) {
  const groups = new Map<string, PreparedTournament>();
  const population = (): AprPopulation => ({ total: 0, counts: new Map() });
  for (const entry of entries) {
    let group = groups.get(entry.tournamentId);
    if (!group) {
      group = {
        id: entry.tournamentId,
        tournament: tournaments[entry.tournamentId]?.tournament,
        unranked: 0,
        field: population(),
        day2: population(),
        top8: population(),
        champions: population(),
      };
      groups.set(entry.tournamentId, group);
    }
    if (
      entry.placement === null ||
      !Number.isSafeInteger(entry.placement) ||
      entry.placement <= 0
    ) {
      group.unranked++;
      continue;
    }
    const keys = new Set(entry.keys.filter(Boolean));
    if (!keys.size) keys.add('unknown');
    const add = (target: AprPopulation) => {
      target.total++;
      for (const key of keys) target.counts.set(key, (target.counts.get(key) ?? 0) + 1);
    };
    add(group.field);
    if (entry.placement <= 8) add(group.top8);
    if (entry.placement <= 1) add(group.champions);
    const day2 = group.tournament?.dayTwoPlayerCount;
    if (Number.isSafeInteger(day2) && day2! > 0 && entry.placement <= day2!) add(group.day2);
  }
  return [...groups.values()];
}

function poolApr(groups: readonly PreparedTournament[], stage: AprStage) {
  const counts = new Map<string, { count: number; advanced: number }>();
  let startTotal = 0;
  let endTotal = 0;
  let tournamentCount = 0;
  let excludedTournamentCount = 0;
  let unrankedDeckCount = 0;
  let incompleteTournamentCount = 0;
  const tournamentIds: string[] = [];

  for (const group of groups) {
    const { id, tournament } = group;
    const dayTwoCount = tournament?.dayTwoPlayerCount;
    const usesDayTwo = stage === 'field-day2' || stage === 'day2-top8';
    if (
      usesDayTwo &&
      (!tournament ||
        !Number.isSafeInteger(dayTwoCount) ||
        !dayTwoCount ||
        dayTwoCount < (stage === 'day2-top8' ? 8 : 1))
    ) {
      excludedTournamentCount++;
      continue;
    }

    unrankedDeckCount += group.unranked;
    const starting =
      stage === 'top8-champions' ? group.top8 : stage === 'day2-top8' ? group.day2 : group.field;
    const advancing =
      stage === 'top8-champions'
        ? group.champions
        : stage === 'field-day2'
          ? group.day2
          : group.top8;
    const attendance =
      tournament?.attendance && tournament.attendance > 0 ? tournament.attendance : undefined;
    const expectedStarting =
      stage === 'top8-champions'
        ? Math.min(8, attendance ?? 8)
        : stage === 'day2-top8'
          ? dayTwoCount
          : attendance;
    // A target-stage-only import cannot establish the earlier field's share.
    // Keep genuinely complete small events where every player advanced.
    const missingBaseline =
      starting.total === advancing.total &&
      (expectedStarting == null || starting.total < expectedStarting);

    // Pool both stages from the same events; an event with no recorded target stage
    // must not lower every archetype's result as though nobody advanced.
    if (!starting.total || !advancing.total || missingBaseline) {
      excludedTournamentCount++;
      continue;
    }

    tournamentCount++;
    tournamentIds.push(id);
    if (tournament?.attendance && group.field.total < tournament.attendance) {
      incompleteTournamentCount++;
    }
    startTotal += starting.total;
    endTotal += advancing.total;
    for (const [key, count] of starting.counts) {
      const item = counts.get(key) ?? { count: 0, advanced: 0 };
      item.count += count;
      item.advanced += advancing.counts.get(key) ?? 0;
      counts.set(key, item);
    }
  }

  const data: AprDataItem[] = [];
  for (const [key, { count, advanced }] of counts) {
    const result = calculateApr(count, advanced, startTotal, endTotal);
    if (result) data.push({ key, count, advanced, ...result });
  }
  data.sort((a, b) => b.apr - a.apr || b.count - a.count || a.key.localeCompare(b.key));

  return {
    data,
    startTotal,
    endTotal,
    tournamentCount,
    excludedTournamentCount,
    unrankedDeckCount,
    incompleteTournamentCount,
    tournamentIds,
  };
}

export function analyzeApr(
  entries: readonly AprEntry[],
  tournaments: AprTournaments,
  stage: AprStage,
) {
  return poolApr(prepareAprTournaments(entries, tournaments), stage);
}

export interface AprComparisonItem {
  key: string;
  count: number;
  values: Record<AprMetric, number | null>;
  samples: Partial<Record<AprStage, AprDataItem>>;
  combinedParts?: { fieldDay2: AprDataItem; day2Top8: AprDataItem };
}

export function analyzeAprComparisons(entries: readonly AprEntry[], tournaments: AprTournaments) {
  const dayTwoIds = new Set<string>();
  const singleStageIds = new Set<string>();
  for (const [id, { tournament }] of Object.entries(tournaments)) {
    const count = tournament.dayTwoPlayerCount;
    if (Number.isSafeInteger(count) && count! > 0) dayTwoIds.add(id);
    else if (count == null || count === 0) singleStageIds.add(id);
  }
  const metrics = aprMetricValues.filter(metric => {
    if (metric === 'field-top8') return singleStageIds.size > 0;
    if (metric === 'top8-champions') return true;
    return dayTwoIds.size > 0;
  });
  const groups = prepareAprTournaments(entries, tournaments);
  const dayTwoGroups = groups.filter(group => dayTwoIds.has(group.id));
  const stages = {
    'field-day2': poolApr(dayTwoGroups, 'field-day2'),
    'field-top8': poolApr(
      groups.filter(group => singleStageIds.has(group.id)),
      'field-top8',
    ),
    'day2-top8': poolApr(dayTwoGroups, 'day2-top8'),
    'top8-champions': poolApr(groups, 'top8-champions'),
  };

  // Combined must sum stages from the same events, even when imports only contain Day 2.
  const fieldDay2Ids = new Set(stages['field-day2'].tournamentIds);
  const combinedIds = new Set(stages['day2-top8'].tournamentIds.filter(id => fieldDay2Ids.has(id)));
  const combinedGroups = dayTwoGroups.filter(group => combinedIds.has(group.id));
  const combined = {
    fieldDay2: poolApr(combinedGroups, 'field-day2'),
    day2Top8: poolApr(combinedGroups, 'day2-top8'),
  };

  const rows = new Map<string, AprComparisonItem>();
  for (const stage of aprStageValues) {
    for (const sample of stages[stage].data) {
      const row: AprComparisonItem = rows.get(sample.key) ?? {
        key: sample.key,
        count: 0,
        values: {
          'field-day2': null,
          'field-top8': null,
          'day2-top8': null,
          'top8-champions': null,
          combined: null,
        },
        samples: {},
      };
      row.values[stage] = sample.apr;
      row.samples[stage] = sample;
      rows.set(sample.key, row);
    }
  }
  const combinedDay2 = new Map(combined.day2Top8.data.map(item => [item.key, item]));
  for (const fieldDay2 of combined.fieldDay2.data) {
    const day2Top8 = combinedDay2.get(fieldDay2.key);
    const row = rows.get(fieldDay2.key);
    // A group absent from Day 2 has no second-stage APR, rather than a zero result.
    if (row && day2Top8) {
      row.values.combined = fieldDay2.apr + day2Top8.apr;
      row.combinedParts = { fieldDay2, day2Top8 };
    }
  }
  for (const group of groups) {
    for (const [key, count] of group.field.counts) {
      const row = rows.get(key);
      if (row) row.count += count;
    }
  }

  return { metrics, stages, combined, data: [...rows.values()] };
}

export function getAprSort(
  { metrics, data }: { metrics: readonly AprMetric[]; data: readonly AprComparisonItem[] },
  requested?: AprMetric,
): AprMetric {
  if (requested && metrics.includes(requested)) return requested;
  const preference: AprMetric[] = [
    'combined',
    'field-top8',
    'field-day2',
    'day2-top8',
    'top8-champions',
  ];
  return (
    preference.find(
      metric => metrics.includes(metric) && data.some(row => row.values[metric] != null),
    ) ?? (metrics.includes('field-top8') ? 'field-top8' : 'top8-champions')
  );
}

export function sortAprComparisons(data: readonly AprComparisonItem[], metric: AprMetric) {
  return [...data].sort((a, b) => {
    const left = a.values[metric];
    const right = b.values[metric];
    if (left == null && right != null) return 1;
    if (right == null && left != null) return -1;
    return (right ?? 0) - (left ?? 0) || b.count - a.count || a.key.localeCompare(b.key);
  });
}
