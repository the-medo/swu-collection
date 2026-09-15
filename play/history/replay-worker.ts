import { practiceCheckpoint } from './practice.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { stateDigest } from '../storage/integrity.ts';
import { parentPort, workerData } from 'node:worker_threads';
import postgres from 'postgres';
import { PostgresGameStore } from '../storage/postgres.ts';
import { HistoryCache, ReplayError } from './cache.ts';
import type { ReplayWork } from './replay-service.ts';
if (!parentPort || !workerData.databaseUrl) throw new Error('Private replay worker');
const port = parentPort;
const sql = postgres(workerData.databaseUrl, { max: 2, idle_timeout: 20, connect_timeout: 5 });
const store = new PostgresGameStore(sql);
const cache = new HistoryCache(id => store.historySource(id), workerData.options);
setInterval(() => cache.prune(), 10_000).unref();
port.on('message', async (message: ReplayWork) => {
  if (message.kind === 'committed') {
    for (const id of message.gameIds) cache.committed(id);
    return;
  }
  try {
    if (message.kind === 'practice') {
      const saved = await cache.seek(message.gameId, {
        kind: 'position',
        position: message.position,
        branch: message.branch,
      });
      if (saved.meta.live || saved.state.result) throw new ReplayError('position');
      port.postMessage({
        id: message.id,
        ok: true,
        value: {
          checkpoint: practiceCheckpoint(saved.state, message.nextGameId),
          sourceHash: stateDigest(encodeState(saved.state)),
        },
      });
      return;
    }
    const value =
      message.kind === 'seek'
        ? await cache.seek(message.gameId, message.request, message.current)
        : message.kind === 'undo'
          ? await cache.prepareUndo(message.gameId, message.actor)
          : message.kind === 'stats'
            ? cache.stats()
            : cache.prune();
    port.postMessage({ id: message.id, ok: true, value });
  } catch (error) {
    port.postMessage({
      id: message.id,
      ok: false,
      code: error instanceof ReplayError ? error.code : 'unavailable',
    });
  }
});
