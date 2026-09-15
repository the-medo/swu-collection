import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DurableGame } from '../host/durable-game.ts';
import type { Lease, PostgresGameStore } from '../storage/postgres.ts';

type Store = Pick<
  PostgresGameStore,
  'claim' | 'release' | 'load' | 'append' | 'renew' | 'findReceipt'
>;
const optionsSchema = z.strictObject({
  maxGames: z.number().int().min(1).max(1000).default(128),
  maxQueue: z.number().int().min(1).max(256).default(32),
  leaseMs: z.number().int().min(1000).max(60_000).default(15_000),
  idleMs: z.number().int().min(0).max(3_600_000).default(120_000),
  checkpointEvery: z.number().int().min(1).max(1000).default(20),
});
export class WorkerError extends Error {
  constructor(readonly code: 'capacity' | 'unavailable' | 'closed') {
    super(`Crossfire worker: ${code}`);
  }
}
type Entry = {
  id: string;
  ready: Promise<DurableGame>;
  host?: DurableGame;
  lease?: Lease;
  references: number;
  queued: number;
  idleAt: number;
  tail: Promise<void>;
  closing?: Promise<void>;
};
export type GameBinding = {
  readonly available: boolean;
  run<T>(operation: (host: DurableGame) => Promise<T>): Promise<T>;
  release(): void;
};

/** Process-owned lifecycle for many durable games. Callers must authenticate
 * before acquiring a binding; callbacks and hosts are entirely server-private. */
export class GameWorker {
  readonly #entries = new Map<string, Entry>();
  readonly #options: z.output<typeof optionsSchema>;
  readonly #owner = `worker-${randomUUID()}`;
  #open = true;
  #maintenance?: Promise<void>;
  #stopping?: Promise<void>;
  constructor(
    private readonly store: Store,
    options: z.input<typeof optionsSchema> = {},
    private readonly now: () => number = Date.now,
  ) {
    this.#options = optionsSchema.parse(options);
  }
  get ownerId() {
    return this.#owner;
  }
  get count() {
    return this.#entries.size;
  }

  async acquire(gameId: string): Promise<GameBinding> {
    z.string().min(1).max(128).parse(gameId);
    if (!this.#open) throw new WorkerError('closed');
    let entry = this.#entries.get(gameId);
    if (!entry) {
      if (this.#entries.size >= this.#options.maxGames) throw new WorkerError('capacity');
      const ready = Promise.withResolvers<DurableGame>();
      entry = {
        id: gameId,
        ready: ready.promise,
        references: 0,
        queued: 0,
        idleAt: this.now(),
        tail: Promise.resolve(),
      };
      this.#entries.set(gameId, entry);
      void this.#load(entry).then(ready.resolve, ready.reject);
    }
    if (entry.closing) throw new WorkerError('unavailable');
    entry.references++;
    try {
      await entry.ready;
      if (!this.#open || entry.closing) throw new WorkerError('closed');
    } catch (error) {
      entry.references--;
      throw error;
    }
    const bound = entry;
    let released = false;
    return {
      get available() {
        return !released && !bound.closing;
      },
      run: operation =>
        released ? Promise.reject(new WorkerError('closed')) : this.#enqueue(bound, operation),
      release: () => {
        if (released) return;
        released = true;
        bound.references--;
        if (!bound.references) bound.idleAt = this.now();
      },
    };
  }
  async #load(entry: Entry): Promise<DurableGame> {
    try {
      const lease = await this.store.claim(entry.id, this.#owner, this.#options.leaseMs);
      if (!lease) throw new WorkerError('unavailable');
      entry.lease = lease;
      const host = await DurableGame.restore(this.store, lease, {
        leaseMs: this.#options.leaseMs,
        checkpointEvery: this.#options.checkpointEvery,
        maxQueue: this.#options.maxQueue,
      });
      if (!this.#open) throw new WorkerError('closed');
      entry.host = host;
      return host;
    } catch (error) {
      if (entry.lease) await this.store.release(entry.lease).catch(() => {});
      if (this.#entries.get(entry.id) === entry) this.#entries.delete(entry.id);
      throw error;
    }
  }
  #enqueue<T>(entry: Entry, operation: (host: DurableGame) => Promise<T>): Promise<T> {
    if (!this.#open || entry.closing) return Promise.reject(new WorkerError('closed'));
    if (entry.queued >= this.#options.maxQueue) return Promise.reject(new WorkerError('capacity'));
    entry.queued++;
    const pending = entry.tail
      .then(async () => {
        if (entry.closing) throw new WorkerError('unavailable');
        const host = await entry.ready;
        try {
          return await operation(host);
        } finally {
          if (host.paused) void this.#retire(entry).catch(() => {});
        }
      })
      .finally(() => {
        entry.queued--;
      });
    entry.tail = pending.then(
      () => {},
      () => {},
    );
    return pending;
  }
  #retire(entry: Entry): Promise<void> {
    if (entry.closing) return entry.closing;
    entry.closing = (async () => {
      try {
        await entry.ready.catch(() => {});
        await entry.tail;
        if (entry.lease) await this.store.release(entry.lease);
      } finally {
        if (this.#entries.get(entry.id) === entry) this.#entries.delete(entry.id);
      }
    })();
    return entry.closing;
  }

  /** The process scheduler invokes this more often than leaseMs. Concurrent
   * ticks coalesce; busy games renew on commands and never grow a timer queue. */
  maintain(): Promise<void> {
    if (this.#maintenance) return this.#maintenance;
    if (!this.#open) return Promise.resolve();
    this.#maintenance = (async () => {
      await Promise.allSettled(
        [...this.#entries.values()].map(entry => {
          if (entry.closing || !entry.host || entry.queued) return Promise.resolve();
          if (!entry.references && this.now() - entry.idleAt >= this.#options.idleMs)
            return this.#retire(entry);
          return this.#enqueue(entry, host => host.heartbeat());
        }),
      );
    })().finally(() => {
      this.#maintenance = undefined;
    });
    return this.#maintenance;
  }
  stop(): Promise<void> {
    if (this.#stopping) return this.#stopping;
    this.#open = false;
    this.#stopping = (async () => {
      await Promise.allSettled([...this.#entries.values()].map(entry => this.#retire(entry)));
    })();
    return this.#stopping;
  }
}
