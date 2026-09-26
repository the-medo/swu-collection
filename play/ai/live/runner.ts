import { isDeepStrictEqual } from 'node:util';
import type { Sql } from 'postgres';
import type { GameWorker } from '../../worker/games.ts';
import type { CrossfireAiReleases } from '../../../server/lib/crossfire/aiReleases.ts';
import { aiModelPinSchema } from '../../../shared/types/crossfire-ai-play.ts';
import { decideAiCommand } from './decide.ts';

/** One bounded scheduler, independent of socket maintenance. A disconnected
 * player resumes on reconnect. Cold/slow inference never owns the game queue. */
export class AiGameRunner {
  private readonly pending = new Map<string, Promise<void>>();
  private readonly last = new Map<string, number>();
  private closed = false;
  private timer?: ReturnType<typeof setInterval>;
  private scanning: Promise<void> | undefined;
  constructor(
    private readonly sql: Sql,
    private readonly worker: GameWorker,
    private readonly releases: CrossfireAiReleases,
    private readonly liveGames: () => string[],
    private readonly committed: (gameId: string) => Promise<void>,
    private readonly fault: () => void = () =>
      console.error('Crossfire AI move deferred; retrying'),
  ) {}

  start() {
    this.timer = setInterval(() => void this.tick(), 250);
    this.timer.unref();
  }
  tick(): Promise<void> {
    if (this.closed || this.pending.size >= 4 || !this.releases.configured)
      return Promise.resolve();
    if (this.scanning) return this.scanning;
    this.scanning = this.scan().finally(() => {
      this.scanning = undefined;
    });
    return this.scanning;
  }
  private async scan() {
    try {
      const active = this.liveGames();
      for (const id of this.last.keys()) if (!active.includes(id)) this.last.delete(id);
      if (!active.length) return;
      const rows = await this
        .sql`SELECT a.game_id,a.pin FROM play.ai_games a JOIN play.games g ON g.id=a.game_id
        WHERE a.game_id=ANY(${active}) AND a.owner_id IS NOT NULL AND g.mode='ai' AND g.status='running'
        AND (a.retry_at IS NULL OR a.retry_at <= clock_timestamp())`;
      rows.sort((a, b) => (this.last.get(a.game_id) ?? 0) - (this.last.get(b.game_id) ?? 0));
      for (const row of rows) {
        if (this.closed || this.pending.size >= 4) break;
        if (this.pending.has(row.game_id)) continue;
        this.last.set(row.game_id, Date.now());
        const work = this.move(row.game_id, row.pin)
          .catch(async () => {
            this.fault();
            await this
              .sql`UPDATE play.ai_games SET retry_at=clock_timestamp()+interval '5 seconds' WHERE game_id=${row.game_id}`.catch(
              () => {},
            );
          })
          .finally(() => this.pending.delete(row.game_id));
        this.pending.set(row.game_id, work);
      }
    } catch {
      this.fault();
    }
  }
  async move(gameId: string, rawPin: unknown) {
    const pin = aiModelPinSchema.parse(rawPin),
      binding = await this.worker.acquire(gameId);
    try {
      const state = await binding.run(async host => host.state);
      if (state.result || state.execution.decision?.playerId !== 'p2') return;
      if (!isDeepStrictEqual(state.versions, pin.versions)) throw new Error('AI target mismatch');
      const runtime = await this.releases.runtime(pin);
      const input = await decideAiCommand(
        state,
        runtime,
        async observation => (await this.releases.choose(pin, observation)).action,
      );
      if (!input || this.closed || !this.liveGames().includes(gameId)) return;
      const result = await binding.run(async host => {
        if (host.state.revision !== state.revision || host.state.result) return null;
        return host.submit('p2', `ai:${state.revision}:${pin.releaseId}`, input, {
          check: async () => true,
          commit: async tx => {
            const [row] =
              await tx`SELECT a.pin FROM play.ai_games a JOIN play.games g ON g.id=a.game_id
              JOIN play.lobbies l ON l.game_id=g.id JOIN play.participants p ON p.lobby_id=l.id AND p.seat='p2'
              WHERE a.game_id=${gameId} AND a.owner_id IS NOT NULL AND g.mode='ai' AND g.status='running'
              AND p.user_id IS NULL AND p.session_id='ai' FOR SHARE OF a,p`;
            return !!row && isDeepStrictEqual(row.pin, pin);
          },
        });
      });
      if (result) {
        await this.sql`UPDATE play.ai_games SET retry_at=NULL WHERE game_id=${gameId}`;
        await this.committed(gameId);
      }
    } finally {
      binding.release();
    }
  }
  async stop() {
    this.closed = true;
    clearInterval(this.timer);
    await this.scanning;
    await Promise.allSettled([...this.pending.values()]);
  }
}
