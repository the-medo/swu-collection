import type {
  LiveTournamentMatchEntry,
  LiveTournamentWeekendTournamentEntry,
} from './liveTournamentTypes.ts';

export const topEightBracketRoundOrder = ['Quarterfinals', 'Semifinals', 'Finals'] as const;
const topCutRoundNames = new Set<string>(topEightBracketRoundOrder);
export const topEightBracketMatchCountByRound: Record<(typeof topEightBracketRoundOrder)[number], number> =
  {
    Quarterfinals: 4,
    Semifinals: 2,
    Finals: 1,
  };

export type BracketRound = {
  roundName: string;
  matches: LiveTournamentMatchEntry[];
};

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMeleeUrl(meleeId: string | null | undefined) {
  return meleeId ? `https://melee.gg/Tournament/View/${meleeId}` : null;
}

export function getHostName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function getYoutubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] ?? null;
      return videoId && YOUTUBE_VIDEO_ID_REGEX.test(videoId) ? videoId : null;
    }

    if (
      hostname !== 'youtube.com' &&
      hostname !== 'www.youtube.com' &&
      hostname !== 'm.youtube.com'
    ) {
      return null;
    }

    const directVideoId = parsedUrl.searchParams.get('v');
    if (directVideoId && YOUTUBE_VIDEO_ID_REGEX.test(directVideoId)) {
      return directVideoId;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length < 2) return null;

    const [, candidateId] = pathSegments;
    if (
      (pathSegments[0] === 'embed' ||
        pathSegments[0] === 'live' ||
        pathSegments[0] === 'shorts') &&
      candidateId &&
      YOUTUBE_VIDEO_ID_REGEX.test(candidateId)
    ) {
      return candidateId;
    }

    return null;
  } catch {
    return null;
  }
}

export function getYoutubeEmbedUrl(url: string) {
  const videoId = getYoutubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null;
}

function parseAdditionalData(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getRoundNameMap(entry: LiveTournamentWeekendTournamentEntry) {
  const additionalData = parseAdditionalData(entry.weekendTournament.additionalData);
  const liveRounds = additionalData.liveRounds;
  const roundNameByNumber = new Map<number, string>();

  if (Array.isArray(liveRounds)) {
    liveRounds.forEach(round => {
      if (
        typeof round === 'object' &&
        round !== null &&
        typeof (round as { number?: unknown }).number === 'number' &&
        typeof (round as { name?: unknown }).name === 'string'
      ) {
        roundNameByNumber.set(
          (round as { number: number }).number,
          (round as { name: string }).name,
        );
      }
    });
  }

  if (entry.weekendTournament.roundNumber && entry.weekendTournament.roundName) {
    roundNameByNumber.set(entry.weekendTournament.roundNumber, entry.weekendTournament.roundName);
  }

  return roundNameByNumber;
}

export function getRoundName(
  entry: LiveTournamentWeekendTournamentEntry,
  roundNumber: number | null | undefined,
) {
  if (roundNumber === null || roundNumber === undefined) return null;

  return getRoundNameMap(entry).get(roundNumber) ?? `Round ${roundNumber}`;
}

export function getBracketRounds(entry: LiveTournamentWeekendTournamentEntry): BracketRound[] {
  const roundNameByNumber = getRoundNameMap(entry);
  const roundsByName = new Map<string, LiveTournamentMatchEntry[]>();

  entry.matches.forEach(match => {
    const roundName = roundNameByNumber.get(match.match.roundNumber);
    if (!roundName || !topCutRoundNames.has(roundName)) return;

    const existing = roundsByName.get(roundName);
    if (existing) {
      existing.push(match);
      return;
    }

    roundsByName.set(roundName, [match]);
  });

  return [...roundsByName.entries()]
    .map(([roundName, matches]) => {
      const maxMatches =
        topEightBracketMatchCountByRound[
          roundName as keyof typeof topEightBracketMatchCountByRound
        ] ?? matches.length;

      return {
        roundName,
        matches: matches.slice(0, maxMatches),
      };
    })
    .sort(
      (a, b) =>
        topEightBracketRoundOrder.indexOf(
          a.roundName as (typeof topEightBracketRoundOrder)[number],
        ) -
        topEightBracketRoundOrder.indexOf(
          b.roundName as (typeof topEightBracketRoundOrder)[number],
        ),
    );
}

export function getLiveMatchWinnerSide(match: LiveTournamentMatchEntry) {
  const player1Wins = match.match.player1GameWin;
  const player2Wins = match.match.player2GameWin;

  if (player1Wins === null || player2Wins === null) return null;
  if (player1Wins === player2Wins) return null;

  return player1Wins > player2Wins ? 'player1' : 'player2';
}

function getMatchLosses(matchRecord: string) {
  const [, losses] = matchRecord.split('-').map(value => Number.parseInt(value, 10));
  return Number.isFinite(losses) ? losses : null;
}

export function getUndefeatedPlayers(entry: LiveTournamentWeekendTournamentEntry) {
  const roundNumber = entry.weekendTournament.roundNumber ?? 0;
  if (roundNumber < 4) return [];

  return entry.standings.filter(row => getMatchLosses(row.standing.matchRecord) === 0);
}

export function getRoundLabel(entry: LiveTournamentWeekendTournamentEntry) {
  if (entry.weekendTournament.roundName) return entry.weekendTournament.roundName;
  return getRoundName(entry, entry.weekendTournament.roundNumber);
}

export function getMatchProgress(entry: LiveTournamentWeekendTournamentEntry) {
  const remaining = entry.weekendTournament.matchesRemaining;
  const total = entry.weekendTournament.matchesTotal;

  if (remaining === null || remaining === undefined) return null;
  if (total === null || total === undefined) return `${remaining} remaining`;

  return `${remaining} / ${total} remaining`;
}

export function getPlayerCount(entry: LiveTournamentWeekendTournamentEntry) {
  const playerCount = entry.tournament.attendance;
  if (playerCount === null || playerCount === undefined) return 'Players unknown';
  return `${playerCount} players`;
}

export function getStatusLabel(
  status: LiveTournamentWeekendTournamentEntry['weekendTournament']['status'],
) {
  switch (status) {
    case 'running':
      return 'Running';
    case 'finished':
      return 'Finished';
    case 'upcoming':
      return 'Upcoming';
    case 'unknown':
      return 'Unknown';
  }
}
