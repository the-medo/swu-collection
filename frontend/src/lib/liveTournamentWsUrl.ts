export const getLiveTournamentWsUrl = (weekendId: string) => {
  const encodedWeekendId = encodeURIComponent(weekendId);
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const envUrl = import.meta.env.VITE_LIVE_TOURNAMENT_WS_URL as string | undefined;

  if (envUrl && envUrl.trim().length > 0) {
    const rawUrl = envUrl
      .replace('{weekendId}', encodedWeekendId)
      .replace(':weekendId', encodedWeekendId);

    try {
      const resolved = new URL(rawUrl, window.location.origin);

      if (resolved.protocol === 'http:') {
        resolved.protocol = 'ws:';
      } else if (resolved.protocol === 'https:') {
        resolved.protocol = 'wss:';
      }

      if (!rawUrl.includes(encodedWeekendId)) {
        resolved.pathname = `${resolved.pathname.replace(/\/$/, '')}/${encodedWeekendId}`;
      }

      return resolved.toString();
    } catch {
      return rawUrl.includes(encodedWeekendId)
        ? rawUrl
        : `${rawUrl.replace(/\/$/, '')}/${encodedWeekendId}`;
    }
  }

  if (import.meta.env.DEV) {
    return `${wsProtocol}://${window.location.hostname}:3010/api/ws/live-tournaments/${encodedWeekendId}`;
  }

  return `${wsProtocol}://${window.location.host}/api/ws/live-tournaments/${encodedWeekendId}`;
};
