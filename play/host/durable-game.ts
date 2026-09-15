import { compatibleVersions } from '../cards/catalog.ts';
import { restoreActionState, undoTarget, undoTimeline } from '../history/timeline.ts';
import type { HistoryCache } from '../history/cache.ts';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { advance, createGame } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { IllegalInput, inputSchema, versions } from '../engine/model.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { gameConfigSchema } from '../engine/state.ts';
import type { GameConfig } from '../engine/state.ts';
import { recoverGame } from '../storage/recover.ts';
import { stateDigest, StorageError } from '../storage/postgres.ts';
import type {
  Append,
  CommitAuthorization,
  Lease,
  PostgresGameStore,
  Receipt,
} from '../storage/postgres.ts';
import type { RetainedEngine } from './bundles.ts';
import type { RandomSource } from './session.ts';

type Store = Pick<PostgresGameStore, 'load' | 'append' | 'findReceipt' | 'renew'>;
const optionsSchema = z.strictObject({
  checkpointEvery: z.number().int().min(1).max(1000),
  leaseMs: z.number().int().min(100).max(60_000),
  maxQueue: z.number().int().min(1).max(256).default(32),
});
export type HostOptions = z.input<typeof optionsSchema>;
export type CommandAuthorization = {
  check: () => Promise<boolean>;
  commit: CommitAuthorization;
};
export type CommittedCommand = {
  receipt: Pick<Receipt, 'sequence' | 'revision'>;
  duplicate: boolean;
  state: GameState;
};

// Recovery checks the exact version tuple before calling this adapter. Historical
// engine objects are never cast to this version's GameState.
const currentRuntime: RetainedEngine = {
  versions,
  supportsVersions: compatibleVersions,
  createGame: raw => createGame(gameConfigSchema.parse(raw)),
  decodeState,
  encodeState: state => encodeState(state as GameState),
  advance: (state, input) => advance(state as GameState, input),
};
function resolveRandom(state: GameState, random: RandomSource) {
  const inputs: EngineInput[] = [];
  const facts = [];
  while (state.execution.random) {
    const request = state.execution.random;
    const input: EngineInput = {
      type: 'random',
      gameId: state.gameId,
      expectedRevision: state.revision,
      requestId: request.id,
      values: request.bounds.map(upper => random(upper)),
    };
    const result = advance(state, input);
    state = result.state;
    inputs.push(input);
    facts.push(...result.facts);
  }
  return { state, inputs, facts };
}

/** Trusted initialization only. Admission must supply a validated frozen deck.
 * The first checkpoint preserves setup; viewers never receive it. Subsequent
 * shuffle requests and their outcomes share the triggering command journal. */
export async function initializeDurableGame(
  store: Pick<PostgresGameStore, 'create'>,
  config: GameConfig,
): Promise<void> {
  await store.create(createInitialCheckpoint(config));
}

export function createInitialCheckpoint(config: GameConfig): string {
  return encodeState(resolveRandom(createGame(gameConfigSchema.parse(config)), randomInt).state);
}

/** One serialized queue per owner/game. The service supplies the authenticated
 * engine seat, never a seat asserted by an untrusted network message. */
export class DurableGame {
  #state!: GameState;
  #sequence = 0;
  #paused = true;
  #tail: Promise<void> = Promise.resolve();
  #queued = 0;
  readonly #options: z.output<typeof optionsSchema>;
  private constructor(
    private readonly store: Store,
    private readonly lease: Lease,
    options: HostOptions,
    private readonly random: RandomSource,
  ) {
    this.#options = optionsSchema.parse(options);
    this.lease = structuredClone(lease);
  }

  static async restore(
    store: Store,
    lease: Lease,
    options: HostOptions,
    random: RandomSource = randomInt,
  ) {
    const host = new DurableGame(store, lease, options, random);
    await host.#recover();
    return host;
  }
  get state(): GameState {
    return structuredClone(this.#state);
  }
  get paused(): boolean {
    return this.#paused;
  }

  #enqueue<T>(run: () => Promise<T>): Promise<T> {
    if (this.#queued >= this.#options.maxQueue)
      return Promise.reject(new Error('Crossfire command queue full'));
    this.#queued++;
    const pending = this.#tail.then(run).finally(() => {
      this.#queued--;
    });
    this.#tail = pending.then(
      () => {},
      () => {},
    );
    return pending;
  }
  async #io<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      // Admission denial occurs before journal writes and rolls back cleanly.
      // An obsolete socket must not pause the opponent's valid game session.
      if (
        !(
          error instanceof StorageError &&
          ['not-authorized', 'undo-pending', 'exit-pending', 'stale-state'].includes(error.code)
        )
      )
        this.#paused = true;
      throw error;
    }
  }
  async #recover() {
    this.#paused = true;
    await this.store.renew(this.lease, this.#options.leaseMs);
    const stored = await this.store.load(this.lease.gameId);
    const recovered = recoverGame(currentRuntime, stored);
    // Validation belongs to the current codec after the exact tuple check above.
    const state = recovered as GameState;
    if (state.execution.random)
      throw new Error('Durable host checkpoint awaits unresolved server randomness');
    await this.store.renew(this.lease, this.#options.leaseMs);
    this.#state = state;
    this.#sequence = stored.sequence;
    this.#paused = false;
  }
  reload(): Promise<void> {
    return this.#enqueue(() => this.#recover());
  }
  heartbeat(): Promise<void> {
    return this.#enqueue(() => this.#io(() => this.store.renew(this.lease, this.#options.leaseMs)));
  }

  submit(
    actorId: string,
    commandId: string,
    raw: unknown,
    authorization?: CommandAuthorization,
  ): Promise<CommittedCommand> {
    // Parse and detach caller-owned data before it can wait in the queue.
    const input = inputSchema.parse(raw);
    z.string().min(1).max(128).parse(commandId);
    if (input.type === 'random' || input.playerId !== actorId || input.gameId !== this.lease.gameId)
      throw new IllegalInput();
    const requestHash = stateDigest(JSON.stringify(input));
    return this.#submit(actorId, commandId, requestHash, () => input, authorization);
  }

  /** Server-only adapter for opaque viewer intent. Receipt lookup precedes
   * translation so a committed command survives a connection/handle change.
   * The caller hashes validated wire intent; clients cannot choose this hash. */
  submitProjected(
    actorId: string,
    commandId: string,
    requestHash: string,
    resolve: (state: GameState) => EngineInput,
    authorization: CommandAuthorization,
  ): Promise<CommittedCommand> {
    z.string().min(1).max(128).parse(commandId);
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(requestHash);
    return this.#submit(actorId, commandId, requestHash, resolve, authorization);
  }

  #submit(
    actorId: string,
    commandId: string,
    requestHash: string,
    resolve: (state: GameState) => EngineInput,
    authorization?: CommandAuthorization,
  ): Promise<CommittedCommand> {
    const check = authorization?.check,
      commit = authorization?.commit;
    return this.#enqueue(async () => {
      if (this.#paused) throw new Error('Crossfire game paused; reload committed state');
      if (!this.#state.seats.includes(actorId)) throw new IllegalInput();
      if (check && !(await check())) throw new StorageError('not-authorized');
      await this.#io(() => this.store.renew(this.lease, this.#options.leaseMs));
      const prior = await this.#io(() =>
        this.store.findReceipt(this.lease.gameId, actorId, commandId),
      );
      if (prior) {
        if (prior.requestHash !== requestHash) throw new StorageError('command-conflict');
        await this.#recover();
        return this.#result(prior, true);
      }
      const input = inputSchema.parse(resolve(this.state));
      if (
        input.type === 'random' ||
        input.playerId !== actorId ||
        input.gameId !== this.lease.gameId
      )
        throw new IllegalInput();
      const first = advance(this.#state, input);
      const resolved = resolveRandom(first.state, this.random);
      const checkpoint = encodeState(resolved.state);
      const entry: Append = {
        actorId,
        commandId,
        requestHash,
        ...(resolved.state.result
          ? { summary: { result: resolved.state.result, round: resolved.state.round } }
          : {}),
        expectedSequence: this.#sequence,
        fromRevision: this.#state.revision,
        revision: resolved.state.revision,
        stateHash: stateDigest(checkpoint),
        inputs: JSON.parse(JSON.stringify([input, ...resolved.inputs])),
        facts: JSON.parse(JSON.stringify([...first.facts, ...resolved.facts])),
        ...((this.#sequence + 1) % this.#options.checkpointEvery === 0 || resolved.state.result
          ? { checkpoint }
          : {}),
      };
      const receipt = await this.#io(() => this.store.append(this.lease, entry, commit));
      if (receipt.duplicate) {
        // A prior commit can win an uncertain-write race. Its random results,
        // not this speculative candidate's draws, are authoritative.
        await this.#recover();
      } else {
        this.#state = resolved.state;
        this.#sequence = receipt.sequence;
      }
      return this.#result(receipt, receipt.duplicate);
    });
  }
  /** Opponent approval is checked and consumed in the same transaction as the branch record. */
  restoreAction(
    prepared: Awaited<ReturnType<HistoryCache['prepareUndo']>>,
    requester: string,
    approver: string,
    requestId: string,
    authorization: CommandAuthorization,
  ): Promise<CommittedCommand> {
    return this.#enqueue(async () => {
      if (this.#paused || !(await authorization.check())) throw new StorageError('not-authorized');
      if (
        this.#sequence !== prepared.head.cursor.sequence ||
        stateDigest(encodeState(this.#state)) !== stateDigest(encodeState(prepared.head.state)) ||
        undoTarget(prepared.head.cursor, this.#state, requester) !==
          prepared.target.cursor.sequence ||
        approver === requester ||
        !this.#state.seats.includes(approver)
      )
        throw new StorageError('stale-state');
      await this.#io(() => this.store.renew(this.lease, this.#options.leaseMs));
      const state = restoreActionState(this.#state, prepared.target.state),
        checkpoint = encodeState(state);
      const control = {
        version: 1 as const,
        kind: 'undo' as const,
        target: prepared.target.cursor.sequence,
        targetHash: stateDigest(encodeState(prepared.target.state)),
        approvedBy: approver,
        nextId: state.nextId,
        disclosure: state.disclosure,
      };
      const receipt = await this.#io(() =>
        this.store.append(
          this.lease,
          {
            actorId: requester,
            commandId: `undo:${requestId}`,
            requestHash: stateDigest(JSON.stringify(control)),
            expectedSequence: this.#sequence,
            fromRevision: this.#state.revision,
            revision: state.revision,
            stateHash: stateDigest(checkpoint),
            checkpoint,
            inputs: [],
            facts: [],
            control,
            timeline: undoTimeline(prepared.head.cursor, prepared.target.cursor),
          },
          authorization.commit,
        ),
      );
      if (receipt.duplicate) await this.#recover();
      else {
        this.#state = state;
        this.#sequence = receipt.sequence;
      }
      return this.#result(receipt, receipt.duplicate);
    });
  }
  #result(receipt: Receipt, duplicate: boolean): CommittedCommand {
    return {
      receipt: { sequence: receipt.sequence, revision: receipt.revision },
      duplicate,
      state: this.state,
    };
  }
}
