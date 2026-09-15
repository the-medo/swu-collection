import { Worker } from 'node:worker_threads';
import type { ReplayPosition, ReplaySeek } from '../view/replay.ts';
import type { HistoryCache, CachedPosition } from './cache.ts';
import { ReplayError } from './cache.ts';
export type ReplayWork =
  | {
      id: number;
      kind: 'seek';
      gameId: string;
      request: ReplaySeek;
      current?: Pick<ReplayPosition, 'position' | 'branch'>;
    }
  | { id: number; kind: 'undo'; gameId: string; actor: string }
  | {
      id: number;
      kind: 'practice';
      gameId: string;
      position: string;
      branch: string;
      nextGameId: string;
    }
  | { id: number; kind: 'stats' | 'prune' }
  | { kind: 'committed'; gameIds: string[] };

/** Shared isolated engine/cache executor. Authorization and viewer projection
 * remain in the socket service; complete states cross only this private IPC. */
export class ReplayService {
  #worker?: Worker;
  #next = 0;
  #closed = false;
  #pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  #dirty = new Set<string>();
  #flush?: ReturnType<typeof setTimeout>;
  constructor(
    private readonly databaseUrl: string,
    private readonly options: ConstructorParameters<typeof HistoryCache>[1] = {},
  ) {}
  #start() {
    if (this.#closed) throw new Error('Crossfire replay closed');
    if (this.#worker) return this.#worker;
    const worker = new Worker(new URL('./replay-worker.ts', import.meta.url), {
      workerData: { databaseUrl: this.databaseUrl, options: this.options },
    });
    this.#worker = worker;
    worker.on('message', (message: { id: number; ok: boolean; value?: unknown; code?: string }) => {
      const call = this.#pending.get(message.id);
      if (!call) return;
      this.#pending.delete(message.id);
      clearTimeout(call.timer);
      if (message.ok) call.resolve(message.value);
      else
        call.reject(
          ['capacity', 'position', 'incompatible'].includes(message.code ?? '')
            ? new ReplayError(message.code as 'capacity' | 'position' | 'incompatible')
            : new Error('Crossfire replay unavailable'),
        );
    });
    worker.on('error', () => this.#failed(worker));
    worker.on('exit', () => this.#failed(worker));
    return worker;
  }
  #failed(worker: Worker) {
    if (this.#worker !== worker) return;
    this.#worker = undefined;
    for (const call of this.#pending.values()) {
      clearTimeout(call.timer);
      call.reject(new Error('Crossfire replay unavailable'));
    }
    this.#pending.clear();
    void worker.terminate();
  }
  #call<T>(work: Omit<Extract<ReplayWork, { id: number }>, 'id'>): Promise<T> {
    if (this.#pending.size >= 32) return Promise.reject(new ReplayError('capacity'));
    const worker = this.#start(),
      id = ++this.#next;
    // Flush accepted gameplay before a following seek can observe the cache.
    if (this.#dirty.size) {
      clearTimeout(this.#flush);
      this.#flush = undefined;
      worker.postMessage({ kind: 'committed', gameIds: [...this.#dirty] } satisfies ReplayWork);
      this.#dirty.clear();
    }
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => this.#failed(worker), 10_000);
      this.#pending.set(id, { resolve, reject, timer });
      worker.postMessage({ ...work, id });
    });
  }
  seek(
    gameId: string,
    request: ReplaySeek,
    current?: Pick<ReplayPosition, 'position' | 'branch'>,
  ): Promise<CachedPosition> {
    return this.#call({ kind: 'seek', gameId, request, current } as Omit<
      Extract<ReplayWork, { kind: 'seek' }>,
      'id'
    >);
  }
  prepareUndo(gameId: string, actor: string): ReturnType<HistoryCache['prepareUndo']> {
    return this.#call({ kind: 'undo', gameId, actor } as Omit<
      Extract<ReplayWork, { kind: 'undo' }>,
      'id'
    >);
  }
  practice(
    gameId: string,
    position: string,
    branch: string,
    nextGameId: string,
  ): Promise<{ checkpoint: string; sourceHash: string }> {
    return this.#call({ kind: 'practice', gameId, position, branch, nextGameId } as Omit<
      Extract<ReplayWork, { kind: 'practice' }>,
      'id'
    >);
  }
  committed(gameId: string) {
    // A cache that has never been opened has nothing to refresh.
    if (!this.#worker || this.#closed) return;
    this.#dirty.add(gameId);
    if (!this.#flush)
      this.#flush = setTimeout(() => {
        this.#flush = undefined;
        this.#worker?.postMessage({
          kind: 'committed',
          gameIds: [...this.#dirty],
        } satisfies ReplayWork);
        this.#dirty.clear();
      }, 0);
  }
  stats(): Promise<{ games: number; bytes: number; snapshots: number; loads: number }> {
    return this.#call({ kind: 'stats' });
  }
  prune(): Promise<void> {
    return this.#call({ kind: 'prune' });
  }
  async stop() {
    this.#closed = true;
    clearTimeout(this.#flush);
    this.#dirty.clear();
    const worker = this.#worker;
    if (worker) {
      this.#failed(worker);
      await worker.terminate();
    }
  }
}
