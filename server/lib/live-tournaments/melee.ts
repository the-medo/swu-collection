import type { Tournament } from '../../db/schema/tournament.ts';
import {
  fetchPlayerDetails,
  fetchRoundMatches,
  fetchRoundStandings,
  fetchTournamentDetails,
  fetchTournamentView,
  type TIMeleeTournamentDetail,
  type TournamentViewRound,
} from '../imports/tournamentImportLib.ts';
import type {
  LiveMeleeMatch,
  LiveMeleePlayer,
  LiveMeleeStanding,
  LiveMeleeTournamentDetail,
  LiveMeleeTournamentProgress,
  LiveTournamentStatus,
} from './types.ts';
import { parseMeleeDecklistLeaderBase } from './meleeDecklists.ts';
import { tournamentExpectsMeleeDecklists } from './tournamentFormat.ts';

const numberOrNull = (value: unknown) => {
  const numberValue = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const stringOrNull = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

export class MeleeRoundsUnavailableError extends Error {
  constructor(readonly meleeId: string) {
    super(`No Melee rounds found for tournament ${meleeId}`);
    this.name = 'MeleeRoundsUnavailableError';
  }
}

const sanitizeTournamentDetail = (detail: TIMeleeTournamentDetail) => {
  const {
    ID: _id,
    BrandImageSource: _brandImageSource,
    OrganizationId: _organizationId,
    ...additionalData
  } = detail;

  return Object.fromEntries(
    Object.entries(additionalData).filter(([, value]) => value !== undefined),
  );
};

const mapMeleeStatus = (status: unknown): LiveTournamentStatus => {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();

  if (!normalized) return 'unknown';

  if (
    normalized.includes('complete') ||
    normalized.includes('finished') ||
    normalized.includes('concluded') ||
    normalized.includes('ended')
  ) {
    return 'finished';
  }

  if (
    normalized.includes('progress') ||
    normalized.includes('running') ||
    normalized.includes('active') ||
    normalized.includes('started')
  ) {
    return 'running';
  }

  if (
    normalized.includes('registration') ||
    normalized.includes('scheduled') ||
    normalized.includes('pending') ||
    normalized.includes('not started')
  ) {
    return 'upcoming';
  }

  return 'unknown';
};

const standingHasDecklist = (standing: any) =>
  Array.isArray(standing?.Decklists) && standing.Decklists.length > 0;

async function hasPlayerDecklistOnHover(standings: any[]) {
  for (const standing of standings.slice(0, 8)) {
    const playerId = numberOrNull(standing?.Team?.Players?.[0]?.ID);
    if (playerId === null) continue;

    const playerData = await fetchPlayerDetails(playerId);
    if (playerData.decklists?.length > 0) {
      return true;
    }
  }

  return false;
}

async function detectDecklistsFromTournamentView(
  view: { finalRoundId: number | null } | undefined,
) {
  if (!view?.finalRoundId) return false;

  try {
    const standings = await fetchRoundStandings(view.finalRoundId);
    return standings.some(standingHasDecklist) || (await hasPlayerDecklistOnHover(standings));
  } catch (error) {
    console.warn('Failed to detect Melee decklists:', error);
    return false;
  }
}

const getPlayerFromCompetitor = (competitor: any): LiveMeleePlayer | null => {
  const player = competitor?.Team?.Players?.[0];
  const meleePlayerId = numberOrNull(player?.ID);
  const displayName =
    stringOrNull(player?.DisplayName) ??
    stringOrNull(player?.Username) ??
    (meleePlayerId === null ? null : `Melee Player ${meleePlayerId}`);

  if (!displayName) return null;

  return {
    displayName,
    meleePlayerId,
  };
};

const parseStanding = (standing: any): LiveMeleeStanding | null => {
  const player = getPlayerFromCompetitor({ Team: standing?.Team });
  const rank = numberOrNull(standing?.Rank);
  if (!player || rank === null) return null;

  const points = numberOrNull(standing?.Points) ?? 0;
  const matchRecord =
    stringOrNull(standing?.MatchRecord) ??
    `${numberOrNull(standing?.MatchWins) ?? 0}-${numberOrNull(standing?.MatchLosses) ?? 0}-${
      numberOrNull(standing?.MatchDraws) ?? 0
    }`;
  const gameRecord =
    stringOrNull(standing?.GameRecord) ??
    `${numberOrNull(standing?.GameWins) ?? 0}-${numberOrNull(standing?.GameLosses) ?? 0}-${
      numberOrNull(standing?.GameDraws) ?? 0
    }`;

  return {
    ...player,
    rank,
    points,
    gameRecord,
    matchRecord,
  };
};

const hasMatchResult = (match: any) => {
  if (match?.HasResult === true) return true;

  const resultString = stringOrNull(match?.ResultString)?.trim();
  return !!resultString && resultString.toLowerCase() !== 'not reported';
};

const competitorGameWins = (competitor: any) =>
  numberOrNull(competitor?.GameWinsAndGameByes) ?? numberOrNull(competitor?.GameWins);

const getCompetitorLeaderBase = (competitor: any, player: LiveMeleePlayer | null) => {
  const decklists = Array.isArray(competitor?.Decklists) ? competitor.Decklists : [];
  const playerDecklist =
    decklists.find(
      (decklist: any) =>
        player?.meleePlayerId !== null &&
        numberOrNull(decklist?.PlayerId) === player?.meleePlayerId &&
        stringOrNull(decklist?.DecklistName)?.trim(),
    ) ?? decklists.find((decklist: any) => stringOrNull(decklist?.DecklistName)?.trim());

  return parseMeleeDecklistLeaderBase(playerDecklist?.DecklistName);
};

const matchUpdatedAt = (match: any) => {
  if (!hasMatchResult(match)) return null;

  return (
    stringOrNull(match?.ResultConfirmed) ??
    stringOrNull(match?.DateUpdated) ??
    stringOrNull(match?.DateModified) ??
    stringOrNull(match?.DateCreated)
  );
};

const matchKey = (match: any, round: TournamentViewRound, player1: LiveMeleePlayer) =>
  stringOrNull(match?.Guid) ??
  `round-${round.id}-table-${stringOrNull(match?.TableNumberDescription) ?? match?.TableNumber ?? match?.SortOrder ?? player1.displayName}`;

const parseMatch = (match: any, round: TournamentViewRound): LiveMeleeMatch | null => {
  const competitors = Array.isArray(match?.Competitors) ? match.Competitors : [];
  const player1 = getPlayerFromCompetitor(competitors[0]);
  if (!player1) return null;

  const player2 = competitors.length > 1 ? getPlayerFromCompetitor(competitors[1]) : null;
  const player1LeaderBase = getCompetitorLeaderBase(competitors[0], player1);
  const player2LeaderBase = getCompetitorLeaderBase(competitors[1], player2);

  return {
    matchKey: matchKey(match, round, player1),
    roundNumber: round.number,
    roundName:
      round.name ??
      stringOrNull(match?.RoundName) ??
      stringOrNull(match?.RoundDescription) ??
      `Round ${round.number}`,
    player1,
    player2,
    leaderCardId1: player1LeaderBase?.leaderCardId ?? null,
    baseCardKey1: player1LeaderBase?.baseCardKey ?? null,
    leaderCardId2: player2LeaderBase?.leaderCardId ?? null,
    baseCardKey2: player2LeaderBase?.baseCardKey ?? null,
    player1GameWin: competitorGameWins(competitors[0]),
    player2GameWin: player2 ? competitorGameWins(competitors[1]) : null,
    updatedAt: matchUpdatedAt(match),
  };
};

const currentRoundFromView = (rounds: TournamentViewRound[]) => {
  const sortedRounds = [...rounds].sort((a, b) => a.number - b.number);
  const runningRound = sortedRounds.find(round => round.started && !round.completed);
  if (runningRound) return runningRound;

  return (
    [...sortedRounds].reverse().find(round => round.started || round.completed) ??
    sortedRounds[0] ??
    null
  );
};

const getImportedRoundMatchCount = (
  importedRoundMatchCounts: Map<number, number> | undefined,
  roundNumber: number,
) => importedRoundMatchCounts?.get(roundNumber) ?? 0;

const isImportedCompletedRound = (
  round: TournamentViewRound,
  importedRoundMatchCounts: Map<number, number> | undefined,
) => round.completed && getImportedRoundMatchCount(importedRoundMatchCounts, round.number) > 0;

const roundsForMatchFetch = (
  rounds: TournamentViewRound[],
  importedRoundMatchCounts: Map<number, number> | undefined,
) =>
  rounds
    .filter(round => round.started && !isImportedCompletedRound(round, importedRoundMatchCounts))
    .sort((a, b) => a.number - b.number);

export async function fetchLiveTournamentDetailFromMelee(params: {
  meleeId: string;
  tournament: Tournament;
}): Promise<LiveMeleeTournamentDetail> {
  const detail = await fetchTournamentDetails(params.meleeId);
  const status = mapMeleeStatus(detail.Status);
  const expectsDecklists = tournamentExpectsMeleeDecklists(params.tournament);
  const view =
    status === 'finished' && expectsDecklists
      ? await fetchTournamentView(params.meleeId)
      : undefined;
  const playerCount =
    numberOrNull(detail.ParticipationCount) ??
    numberOrNull(detail.ParticipatorCount) ??
    params.tournament.attendance ??
    null;

  return {
    meleeId: params.meleeId,
    status,
    exactStart: stringOrNull(detail.StartDate),
    playerCount,
    hasDecklists: expectsDecklists ? await detectDecklistsFromTournamentView(view) : false,
    additionalData: sanitizeTournamentDetail(detail),
  };
}

export async function fetchLiveTournamentProgressFromMelee(params: {
  meleeId: string;
  importedRoundMatchCounts?: Map<number, number>;
}): Promise<LiveMeleeTournamentProgress> {
  const tournamentView = await fetchTournamentView(params.meleeId);
  const rounds = tournamentView?.rounds ?? [];
  const currentRound = currentRoundFromView(rounds);

  if (!currentRound) {
    throw new MeleeRoundsUnavailableError(params.meleeId);
  }

  const rawStandings = await fetchRoundStandings(currentRound.id);
  const standings = rawStandings
    .map(parseStanding)
    .filter((standing): standing is LiveMeleeStanding => standing !== null);

  const matchRounds = roundsForMatchFetch(rounds, params.importedRoundMatchCounts);
  const skippedCompletedMatchRounds = rounds.filter(round =>
    isImportedCompletedRound(round, params.importedRoundMatchCounts),
  );
  const rawMatchesByRoundId = new Map<number, any[]>();
  const matches: LiveMeleeMatch[] = [];

  for (const round of matchRounds) {
    const rawMatches = await fetchRoundMatches(round.id);
    rawMatchesByRoundId.set(round.id, rawMatches);

    for (const rawMatch of rawMatches) {
      const parsedMatch = parseMatch(rawMatch, round);
      if (parsedMatch) {
        matches.push(parsedMatch);
      }
    }
  }

  const currentRoundMatches = rawMatchesByRoundId.get(currentRound.id);
  const currentRoundImportedMatchCount = getImportedRoundMatchCount(
    params.importedRoundMatchCounts,
    currentRound.number,
  );
  const currentRoundMatchesTotal =
    currentRoundMatches?.length ?? (currentRound.completed ? currentRoundImportedMatchCount : 0);
  const currentRoundMatchesRemaining = currentRoundMatches
    ? currentRoundMatches.filter(match => !hasMatchResult(match)).length
    : 0;

  return {
    meleeId: params.meleeId,
    roundNumber: currentRound.number,
    roundName: currentRound.name,
    matchesTotal: currentRoundMatchesTotal,
    matchesRemaining: currentRoundMatchesRemaining,
    standings,
    matches,
    additionalData: {
      liveRounds: rounds,
      liveFinalRoundId: tournamentView?.finalRoundId ?? null,
      liveAllRoundIds: tournamentView?.allRoundIds ?? [],
      liveCurrentRoundId: currentRound.id,
      liveStandingRoundId: currentRound.id,
      liveMatchRoundIds: matchRounds.map(round => round.id),
      liveSkippedCompletedMatchRoundIds: skippedCompletedMatchRounds.map(round => round.id),
    },
  };
}
