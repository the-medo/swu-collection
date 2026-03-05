export const getGameResultsWsUrl = () => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const envUrl = import.meta.env.VITE_GAME_RESULTS_WS_URL as string | undefined;

  if (envUrl && envUrl.trim().length > 0) {
    try {
      const resolved = new URL(envUrl, window.location.origin);

      if (resolved.protocol === 'http:') {
        resolved.protocol = 'ws:';
      } else if (resolved.protocol === 'https:') {
        resolved.protocol = 'wss:';
      }

      return resolved.toString();
    } catch {
      return envUrl;
    }
  }

  if (import.meta.env.DEV) {
    return `${wsProtocol}://${window.location.hostname}:3010/api/ws/game-results`;
  }

  return `${wsProtocol}://${window.location.host}/api/ws/game-results`;
};
