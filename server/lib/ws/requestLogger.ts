import type { MiddlewareHandler } from 'hono';
import { logger } from 'hono/logger';

function websocketEndpoint(path: string) {
  if (/^\/api\/ws\/events\/?$/.test(path)) return 'app-events';
  if (/^\/api\/ws\/invitations\/crossfire\/?$/.test(path)) return 'crossfire-invitations';
  if (/^\/api\/ws\/game-results\/?$/.test(path)) return 'game-results';
  if (/^\/api\/ws\/live-tournaments\/[^/]+\/?$/.test(path)) return 'live-tournaments';
}

export function requestLogger({
  print = console.log,
  websocketSummaryIntervalMs = 60_000,
}: {
  print?: (message: string) => void;
  websocketSummaryIntervalMs?: number;
} = {}): MiddlewareHandler {
  const logRequest = logger(print);
  const counts = new Map<string, number>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  return async (c, next) => {
    const endpoint = websocketEndpoint(c.req.path);
    if (
      !endpoint ||
      c.req.method !== 'GET' ||
      c.req.header('upgrade')?.toLowerCase() !== 'websocket'
    )
      return logRequest(c, next);

    const messages: string[] = [];
    await logger(message => messages.push(message))(c, next);
    if (c.error || (c.res.status !== 200 && c.res.status !== 101)) {
      messages.forEach(message => print(message));
      return;
    }

    // Hono/Bun represents an upgrade as 200 here. Count requests, not admitted
    // users: an upgraded socket can still be rejected with a WebSocket close code.
    counts.set(endpoint, (counts.get(endpoint) ?? 0) + 1);
    if (!timer) {
      timer = setTimeout(() => {
        const summary = [...counts].map(([name, count]) => `${name}=${count}`).join(', ');
        counts.clear();
        timer = undefined;
        print(
          `[ws] WebSocket upgrade requests (${websocketSummaryIntervalMs / 1000}s): ${summary}`,
        );
      }, websocketSummaryIntervalMs);
      timer.unref();
    }
  };
}
