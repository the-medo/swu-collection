import { WSContext } from 'hono/ws';
import { getAppRealtime } from './appRealtime.ts';
import type { AppPrincipal } from './appRealtimeAccess.ts';

/** Reauthorize legacy event sockets on every outbound frame, including heartbeats.
 * Keep ordering and bound queued data while an authorization query is pending.
 */
export function createSessionCheckedSocket(
  ws: WSContext,
  principal: AppPrincipal,
  cleanup: () => void,
  authorize: (principal: AppPrincipal) => Promise<unknown> = identity =>
    getAppRealtime().authorize(identity),
) {
  let closed = false;
  let pending = 0;
  let tail = Promise.resolve();
  const dispose = () => {
    if (closed) return;
    closed = true;
    cleanup();
  };
  const close = (code = 1000, reason = '') => {
    if (closed) return;
    dispose();
    ws.close(code, reason);
  };
  const socket = new WSContext({
    raw: ws.raw,
    get readyState() {
      return ws.readyState;
    },
    close,
    send: (data, options) => {
      if (closed) return;
      if (pending >= 64) {
        close(4408, 'Too many pending messages');
        return;
      }
      pending++;
      tail = tail
        .then(async () => {
          if (closed) return;
          if (!(await authorize(principal))) {
            close(4401, 'Session expired');
            return;
          }
          if (!closed && ws.readyState === 1)
            ws.send(data instanceof Uint8Array ? new Uint8Array(data) : data, options);
        })
        .catch(() => {
          close(1013, 'Temporarily unavailable');
        })
        .finally(() => {
          pending--;
        });
    },
  });
  return { socket, dispose };
}
