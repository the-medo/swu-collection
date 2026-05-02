import type { TournamentWeekendResourceType } from '../../../types/TournamentWeekend.ts';

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const MELEE_TOURNAMENT_ID_REGEX = /^[A-Za-z0-9-]+$/;

function normalizeBareValue(value: string) {
  return value.trim();
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function extractYoutubeVideoId(value: string) {
  const normalizedValue = normalizeBareValue(value);
  const url = parseUrl(normalizedValue);

  if (!url) return null;

  const hostname = url.hostname.toLowerCase();

  if (hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? null;
    return id && YOUTUBE_VIDEO_ID_REGEX.test(id) ? id : null;
  }

  if (hostname !== 'youtube.com' && hostname !== 'www.youtube.com' && hostname !== 'm.youtube.com') {
    return null;
  }

  const videoId = url.searchParams.get('v');
  if (videoId && YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return videoId;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
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
}

export function getCanonicalYoutubeUrl(value: string) {
  const videoId = extractYoutubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function extractMeleeTournamentId(value: string) {
  const normalizedValue = normalizeBareValue(value);

  if (MELEE_TOURNAMENT_ID_REGEX.test(normalizedValue)) {
    return normalizedValue;
  }

  const url = parseUrl(normalizedValue);
  if (!url) return null;

  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'melee.gg' && hostname !== 'www.melee.gg') {
    return null;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (pathSegments.length < 3) return null;

  if (
    pathSegments[0]?.toLowerCase() !== 'tournament' ||
    pathSegments[1]?.toLowerCase() !== 'view'
  ) {
    return null;
  }

  const tournamentId = pathSegments[2] ?? null;
  return tournamentId && MELEE_TOURNAMENT_ID_REGEX.test(tournamentId) ? tournamentId : null;
}

export function getCanonicalMeleeTournamentUrl(value: string) {
  const tournamentId = extractMeleeTournamentId(value);
  return tournamentId ? `https://melee.gg/Tournament/View/${tournamentId}` : null;
}

export function normalizeTournamentWeekendResourceUrl(
  resourceType: TournamentWeekendResourceType,
  resourceUrl: string,
) {
  switch (resourceType) {
    case 'stream':
      return getCanonicalYoutubeUrl(resourceUrl);
    case 'melee':
      return getCanonicalMeleeTournamentUrl(resourceUrl);
    case 'video':
    case 'vod':
      return null;
  }
}
