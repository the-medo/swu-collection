export function crossfireWsUrl(gameId: string, origin = window.location.origin) {
  const template = import.meta.env.VITE_CROSSFIRE_WS_URL || '/api/ws/crossfire/:gameId';
  const url = new URL(template.replace(':gameId', encodeURIComponent(gameId)), origin);
  url.protocol =
    url.protocol === 'https:' ? 'wss:' : url.protocol === 'http:' ? 'ws:' : url.protocol;
  if (
    !['ws:', 'wss:'].includes(url.protocol) ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error('Invalid Crossfire WebSocket URL');
  return url.toString();
}
