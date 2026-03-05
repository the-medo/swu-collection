import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useMemo, useRef, useState } from 'react';
import { getGameResultsWsUrl } from '@/lib/gameResultsWsUrl.ts';

type SocketStatus = 'closed' | 'connecting' | 'open';

export const Route = createFileRoute('/tools/websocket/')({
  component: WebSocketDemoPage,
});

function WebSocketDemoPage() {
  const defaultUrl = useMemo(() => getGameResultsWsUrl(), []);

  const [socketUrl, setSocketUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<SocketStatus>('closed');
  const [logs, setLogs] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const pushLog = (line: string) => {
    setLogs(prev => [`${new Date().toISOString()} ${line}`, ...prev].slice(0, 120));
  };

  const connect = () => {
    if (socketRef.current || status === 'connecting') return;

    setStatus('connecting');
    pushLog(`[connect] ${socketUrl}`);

    const ws = new WebSocket(socketUrl);

    const timeoutId = window.setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        pushLog('[timeout] handshake did not complete in 7000ms');
        ws.close();
      }
    }, 7000);

    ws.onopen = () => {
      window.clearTimeout(timeoutId);
      socketRef.current = ws;
      setStatus('open');
      pushLog('[open] connected');
    };

    ws.onmessage = event => {
      const raw = String(event.data);

      try {
        const parsed = JSON.parse(raw) as {
          type?: string;
          data?: {
            gameId?: string;
            userId?: string;
            gameNumber?: number;
            isWinner?: boolean;
            teamIds?: string[];
          };
          meta?: { teamIds?: string[] };
        };

        if (parsed.type === 'game_results.connected') {
          pushLog(
            `[connected] user=${parsed.data?.userId ?? 'unknown'} teams=${(parsed.data?.teamIds ?? []).join(',') || '-'}`,
          );
          return;
        }

        if (parsed.type === 'game_result.upserted') {
          pushLog(
            `[game] gameId=${parsed.data?.gameId ?? '-'} user=${parsed.data?.userId ?? '-'} gameNo=${parsed.data?.gameNumber ?? '-'} winner=${String(parsed.data?.isWinner)} teams=${(parsed.meta?.teamIds ?? []).join(',') || '-'}`,
          );
          return;
        }

        if (parsed.type === 'pong') {
          pushLog('[pong] server heartbeat response');
          return;
        }

        pushLog(`[recv] ${raw}`);
      } catch {
        pushLog(`[recv] ${raw}`);
      }
    };

    ws.onerror = () => {
      pushLog('[error] websocket error');
    };

    ws.onclose = event => {
      window.clearTimeout(timeoutId);
      socketRef.current = null;
      setStatus('closed');
      pushLog(`[close] code=${event.code} reason=${event.reason || 'n/a'}`);
    };
  };

  const disconnect = () => {
    const ws = socketRef.current;
    if (!ws) return;

    ws.close(1000, 'Client disconnect');
  };

  const ping = () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pushLog('[warn] connect first');
      return;
    }

    ws.send('ping');
    pushLog('[sent] ping');
  };

  return (
    <>
      <Helmet title="WebSocket Demo | SWUBase" />
      <div className="container mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-semibold">WebSocket Demo</h1>

        <div className="rounded border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            This stream sends realtime game updates for your account and your teams.
          </p>

          <label className="block text-sm font-medium" htmlFor="socket-url">
            WebSocket URL
          </label>
          <input
            id="socket-url"
            className="w-full rounded border px-3 py-2"
            value={socketUrl}
            onChange={e => setSocketUrl(e.target.value)}
            placeholder="ws://localhost:3010/api/ws/game-results"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded border px-3 py-2" onClick={connect} disabled={status !== 'closed'}>
              Connect
            </button>
            <button className="rounded border px-3 py-2" onClick={disconnect} disabled={status === 'closed'}>
              Disconnect
            </button>
            <button className="rounded border px-3 py-2" onClick={ping} disabled={status !== 'open'}>
              Ping
            </button>
            <span className="text-sm">Status: {status}</span>
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="font-medium mb-2">Logs</h2>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-sm">
            {logs.length > 0 ? logs.join('\n') : 'No events yet'}
          </pre>
        </div>
      </div>
    </>
  );
}
