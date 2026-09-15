import { compatibleVersions } from '../cards/catalog.ts';
import { undoTarget } from './timeline.ts';
import { historyHandle } from './handles.ts';
import { z } from 'zod';
import { decodeState } from '../engine/checkpoint.ts';
import type { GameState } from '../engine/model.ts';
import { stateDigest } from '../storage/integrity.ts';
import type { ReplayPosition, ReplaySeek } from '../view/replay.ts';
import { applyRecord, historyFailure, restoreRecord } from './records.ts';
import type { History } from './records.ts';
import { cursorOf, initialCursor } from './timeline.ts';
import type { HistoryCursor } from './timeline.ts';

const optionsSchema = z.strictObject({
  idleMs: z.number().int().min(1).default(240_000),
  checkpointActions: z.number().int().min(5).max(10).default(5),
  maxGames: z.number().int().min(1).max(128).default(32),
  maxBytes: z
    .number()
    .int()
    .min(1024)
    .default(256 * 1024 * 1024),
  maxGameBytes: z
    .number()
    .int()
    .min(1024)
    .default(64 * 1024 * 1024),
  maxLoads: z.number().int().min(1).max(16).default(4),
  maxSnapshots: z.number().int().min(2).max(512).default(128),
});
export class ReplayError extends Error {
  constructor(readonly code: 'capacity' | 'position' | 'incompatible') {
    super(`Crossfire replay: ${code}`);
  }
}
type Point = {
  state: GameState;
  cursor: HistoryCursor;
  actions: number;
  bytes: number;
  used: number;
};
type Entry = {
  history: History;
  key: string;
  bytes: number;
  used: number;
  dirty: boolean;
  points: Map<number, Point>;
  positions: Map<string, number>;
  handles: Map<number, string>;
  branches: Map<number, { tip: number; id: string; label: string }>;
  branchOf: Map<number, number>;
};
export type ReplaySource = { history: History; key: string };
export type CachedPosition = { state: GameState; cursor: HistoryCursor; meta: ReplayPosition };
const byteSize = (value: unknown) => Buffer.byteLength(JSON.stringify(value));

/** Private state cache. Run this in the replay worker; it never owns seats,
 * projects viewers or extends activity in response to a heartbeat. */
export class HistoryCache {
  readonly #entries = new Map<string, Entry>();
  readonly #loads = new Map<string, Promise<Entry>>();
  readonly #dirtyLoads = new Set<string>();
  readonly #options: z.output<typeof optionsSchema>;
  constructor(
    private readonly load: (gameId: string) => Promise<ReplaySource>,
    options: z.input<typeof optionsSchema> = {},
    private readonly now = Date.now,
  ) {
    this.#options = optionsSchema.parse(options);
  }
  stats() {
    return {
      games: this.#entries.size,
      bytes: this.#bytes(),
      loads: this.#loads.size,
      snapshots: [...this.#entries.values()].reduce((n, e) => n + e.points.size, 0),
    };
  }
  #bytes() {
    return [...this.#entries.values()].reduce((n, entry) => n + entry.bytes, 0);
  }
  prune() {
    for (const [id, entry] of this.#entries)
      if (!this.#loads.has(id) && this.now() - entry.used >= this.#options.idleMs)
        this.#entries.delete(id);
  }
  committed(gameId: string) {
    if (this.#loads.has(gameId)) this.#dirtyLoads.add(gameId);
    const entry = this.#entries.get(gameId);
    if (entry) {
      entry.used = this.now();
      entry.dirty = true;
    }
  }
  clear() {
    this.#entries.clear();
  }
  #room(protectedId: string) {
    while (this.#entries.size > this.#options.maxGames || this.#bytes() > this.#options.maxBytes) {
      const victim = [...this.#entries]
        .filter(([id]) => id !== protectedId && !this.#loads.has(id))
        .sort((a, b) => a[1].used - b[1].used)[0];
      if (!victim) {
        this.#entries.delete(protectedId);
        throw new ReplayError('capacity');
      }
      this.#entries.delete(victim[0]);
    }
  }
  async #get(gameId: string): Promise<Entry> {
    this.prune();
    const old = this.#entries.get(gameId);
    if (old && !old.dirty) {
      old.used = this.now();
      return old;
    }
    const pending = this.#loads.get(gameId);
    if (pending) return pending;
    if (this.#loads.size >= this.#options.maxLoads) throw new ReplayError('capacity');
    const work = this.load(gameId)
      .then(({ history, key }) => {
        if (typeof key !== 'string' || key.length < 16) historyFailure();
        if (history.gameId !== gameId || !compatibleVersions(history.versions))
          throw new ReplayError('incompatible');
        if (
          history.checkpoint.sequence !== 0 ||
          history.journal.length !== history.sequence ||
          history.sequence > 10_000 ||
          stateDigest(history.checkpoint.checkpoint) !== history.checkpoint.stateHash
        )
          historyFailure();
        const state = decodeState(history.checkpoint.checkpoint);
        const head = history.journal.at(-1) ?? history.checkpoint;
        if (head.stateHash !== history.stateHash || head.revision !== history.revision)
          historyFailure();
        if (state.gameId !== gameId || state.revision !== history.checkpoint.revision)
          historyFailure();
        if (
          old &&
          (old.key !== key ||
            old.history.sequence > history.sequence ||
            old.history.checkpoint.stateHash !== history.checkpoint.stateHash ||
            old.history.journal.some(
              (e, i) =>
                e.stateHash !== history.journal[i]?.stateHash ||
                e.requestHash !== history.journal[i]?.requestHash,
            ))
        )
          historyFailure();
        const point: Point = {
          state,
          cursor: initialCursor(),
          actions: 0,
          bytes: byteSize(state),
          used: this.now(),
        };
        const points = old?.points ?? new Map([[0, point]]);
        const entry: Entry = {
          history,
          key,
          used: this.now(),
          dirty: this.#dirtyLoads.has(gameId),
          points,
          bytes: byteSize(history) + [...points.values()].reduce((n, p) => n + p.bytes, 0),
          positions: new Map(),
          handles: new Map(),
          branches: new Map(),
          branchOf: new Map([[0, 0]]),
        };
        let branch = 0,
          branchNumber = 0;
        const token = (kind: 'position' | 'branch', value: number) =>
          historyHandle(key, gameId, kind, value);
        entry.branches.set(0, { tip: 0, id: token('branch', 0), label: 'Original' });
        entry.handles.set(0, token('position', 0));
        for (const [i, e] of history.journal.entries()) {
          if (e.sequence !== i + 1) historyFailure();
          if (e.control) {
            if (e.control.target >= e.sequence) historyFailure();
            branch = e.sequence;
            entry.branches.set(branch, {
              tip: e.sequence,
              id: token('branch', branch),
              label: `After undo ${++branchNumber}`,
            });
          }
          entry.branches.get(branch)!.tip = e.sequence;
          entry.branchOf.set(e.sequence, branch);
          entry.handles.set(e.sequence, token('position', e.sequence));
        }
        for (const [sequence, handle] of entry.handles) entry.positions.set(handle, sequence);
        // Account for indexes as well as encoded history/state payloads.
        entry.bytes +=
          byteSize([...entry.handles]) +
          byteSize([...entry.branches]) +
          byteSize([...entry.branchOf]);
        if (entry.bytes > this.#options.maxGameBytes) throw new ReplayError('capacity');
        this.#entries.set(gameId, entry);
        this.#room(gameId);
        return entry;
      })
      .finally(() => {
        this.#loads.delete(gameId);
        this.#dirtyLoads.delete(gameId);
      });
    this.#loads.set(gameId, work);
    return work;
  }
  #save(entry: Entry, point: Point) {
    const sequence = point.cursor.sequence;
    if (!entry.points.has(sequence)) {
      entry.points.set(sequence, point);
      entry.bytes += point.bytes;
    }
    while (
      entry.points.size > this.#options.maxSnapshots ||
      entry.bytes > this.#options.maxGameBytes
    ) {
      const victim = [...entry.points]
        .filter(([seq]) => seq !== 0 && seq !== sequence)
        .sort((a, b) => a[1].used - b[1].used)[0];
      if (!victim) {
        if (sequence !== 0) {
          entry.points.delete(sequence);
          entry.bytes -= point.bytes;
        }
        throw new ReplayError('capacity');
      }
      entry.points.delete(victim[0]);
      entry.bytes -= victim[1].bytes;
    }
    this.#room(entry.history.gameId);
  }
  #at(entry: Entry, sequence: number): Point {
    const path: number[] = [];
    let parent = sequence;
    while (!entry.points.has(parent)) {
      const record = entry.history.journal[parent - 1];
      if (!record) throw new ReplayError('position');
      path.push(parent);
      parent = record.control?.target ?? parent - 1;
    }
    let point = entry.points.get(parent)!;
    point.used = this.now();
    let sinceSaved = 0;
    for (const step of path.reverse()) {
      const record = entry.history.journal[step - 1]!;
      const result = record.control
        ? restoreRecord(point, record)
        : applyRecord(point.state, point.cursor, record, () => undefined);
      const cursor = cursorOf(result.timeline);
      const actions = point.actions + (result.timeline.action && !cursor.openAction ? 1 : 0);
      point = {
        state: result.state,
        cursor,
        actions,
        bytes: byteSize(result.state),
        used: this.now(),
      };
      sinceSaved++;
      if (
        (!cursor.openAction && actions > 0 && actions % this.#options.checkpointActions === 0) ||
        sinceSaved >= 20
      ) {
        this.#save(entry, point);
        sinceSaved = 0;
      }
    }
    this.#save(entry, point);
    return point;
  }
  async prepareUndo(gameId: string, actor: string) {
    const head = await this.seek(gameId, { kind: 'end' });
    const target = undoTarget(head.cursor, head.state, actor);
    if (target === null) throw new ReplayError('position');
    const entry = await this.#get(gameId);
    if (entry.history.sequence !== head.cursor.sequence) throw new ReplayError('capacity');
    const saved = this.#at(entry, target);
    return {
      head,
      target: { state: structuredClone(saved.state), cursor: structuredClone(saved.cursor) },
    };
  }
  async seek(
    gameId: string,
    request: ReplaySeek,
    current?: Pick<ReplayPosition, 'position' | 'branch'>,
  ): Promise<CachedPosition> {
    let entry = await this.#get(gameId);
    // A concurrent load may have begun before the commit that triggered this seek.
    for (let retry = 0; entry.dirty && retry < 3; retry++) entry = await this.#get(gameId);
    if (entry.dirty) throw new ReplayError('capacity');
    let sequence = current ? entry.positions.get(current.position) : 0;
    let branch = current
      ? [...entry.branches].find(([, b]) => b.id === current.branch)?.[0]
      : entry.branchOf.get(entry.history.sequence);
    if (sequence === undefined || branch === undefined) throw new ReplayError('position');
    if (request.kind === 'position') {
      sequence = entry.positions.get(request.position);
      if (sequence === undefined) throw new ReplayError('position');
      branch = request.branch
        ? [...entry.branches].find(([, b]) => b.id === request.branch)?.[0]
        : entry.branchOf.get(sequence)!;
      if (branch === undefined) throw new ReplayError('position');
    }
    if (request.kind === 'branch') {
      const selected = [...entry.branches].find(([, b]) => b.id === request.branch);
      if (!selected) throw new ReplayError('position');
      branch = selected[0];
      sequence = selected[1].tip;
    }
    const line: number[] = [];
    let n = entry.branches.get(branch)!.tip;
    while (n) {
      line.push(n);
      n = entry.history.journal[n - 1]!.control?.target ?? n - 1;
    }
    line.push(0);
    line.reverse();
    let index = line.indexOf(sequence);
    if (index < 0) throw new ReplayError('position');
    if (request.kind === 'start') index = 0;
    if (request.kind === 'end') index = line.length - 1;
    if (request.kind === 'step')
      index = Math.max(0, Math.min(line.length - 1, index + request.offset));
    if (request.kind === 'fraction') index = Math.round((line.length - 1) * request.value);
    if (request.kind === 'action') {
      const initialAction = this.#at(entry, line[index]!).cursor.openAction?.id;
      do {
        const next = index + request.direction;
        if (next < 0 || next >= line.length) break;
        index = next;
        const at = this.#at(entry, line[index]!);
        if (!at.cursor.openAction || (initialAction && at.cursor.openAction.id !== initialAction))
          break;
      } while (true);
    }
    const result = this.#at(entry, line[index]!);
    return {
      state: structuredClone(result.state),
      cursor: structuredClone(result.cursor),
      meta: {
        position: entry.handles.get(line[index]!)!,
        branch: entry.branches.get(branch)!.id,
        branches: [...entry.branches.values()].map(({ id, label }) => ({ id, label })),
        steps: {
          previous: index ? entry.handles.get(line[index - 1]!)! : null,
          next: index < line.length - 1 ? entry.handles.get(line[index + 1]!)! : null,
          backFive: index ? entry.handles.get(line[Math.max(0, index - 5)]!)! : null,
          forwardFive:
            index < line.length - 1
              ? entry.handles.get(line[Math.min(line.length - 1, index + 5)]!)!
              : null,
        },
        progress: line.length <= 1 ? 0 : index / (line.length - 1),
        atStart: index === 0,
        atEnd: index === line.length - 1,
        live: !entry.history.summary,
      },
    };
  }
}
