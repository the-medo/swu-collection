import { loadGameVersions } from './card-bundles.ts';
import { notifyGame } from './game-events.ts';
import type { Sql, TransactionSql } from 'postgres';
import { z } from 'zod';
import { bundleVersionsSchema } from '../host/bundles.ts';
import type { BundleVersions } from '../host/bundles.ts';
import { timelineSchema, undoControlSchema } from '../history/timeline.ts';
import type { Timeline, UndoControl } from '../history/timeline.ts';
import { summarySchema, verifyHistory } from '../history/records.ts';
import type { History } from '../history/records.ts';
import { decodeArchive } from '../history/archive.ts';
import type { Archive } from '../history/archive.ts';

const id = z.string().min(1).max(128);
const count = z.number().int().nonnegative().max(2_147_483_647);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const leaseSchema = z.strictObject({ gameId: id, ownerId: id, fence: count.positive() });
export type Lease = z.infer<typeof leaseSchema>;
export type Receipt = { sequence: number; revision: number; requestHash: string };
export type JournalEntry = Receipt & {
  actorId: string;
  commandId: string;
  fromRevision: number;
  stateHash: string;
  inputs: unknown[];
  facts: unknown[];
  timeline?: Timeline;
  control?: UndoControl;
};
export type Recovery = {
  gameId: string;
  versions: BundleVersions;
  sequence: number;
  revision: number;
  stateHash: string;
  checkpoint: { sequence: number; revision: number; stateHash: string; checkpoint: string };
  journal: JournalEntry[];
};
const appendSchema = z.strictObject({
  actorId: id,
  commandId: id,
  requestHash: hash,
  expectedSequence: count,
  fromRevision: count,
  revision: count,
  stateHash: hash,
  inputs: z.array(z.json()).max(100_000),
  facts: z.array(z.json()).max(100_000),
  checkpoint: z.string().optional(),
  timeline: timelineSchema.optional(),
  control: undoControlSchema.optional(),
  summary: summarySchema.optional(),
});
export type Append = z.infer<typeof appendSchema>;
/** Server-side admission, evaluated while the command transaction holds its locks. */
export type CommitAuthorization = (tx: TransactionSql) => Promise<boolean>;
export { stateDigest } from './integrity.ts';
import { stateDigest } from './integrity.ts';

export class StorageError extends Error {
  constructor(
    readonly code:
      | 'undo-pending'
      | 'exit-pending'
      | 'sealed-game'
      | 'missing-game'
      | 'owner-lost'
      | 'stale-state'
      | 'command-conflict'
      | 'not-authorized'
      | 'invalid-checkpoint',
  ) {
    super(`Crossfire storage: ${code}`);
  }
}
export function checkpointMetadata(checkpoint: string) {
  if (Buffer.byteLength(checkpoint) > 8_388_608) throw new StorageError('invalid-checkpoint');
  return z
    .object({ gameId: id, versions: bundleVersionsSchema, revision: count })
    .parse(JSON.parse(checkpoint));
}
const sameVersions = (a: BundleVersions, b: BundleVersions) =>
  JSON.stringify(bundleVersionsSchema.parse(a)) === JSON.stringify(bundleVersionsSchema.parse(b));
const receipt = (row: Record<string, any>): Receipt => ({
  sequence: row.sequence,
  revision: row.revision,
  requestHash: row.request_hash,
});
async function owned(tx: TransactionSql, lease: Lease) {
  const rows = await tx`
    SELECT versions, sequence, revision, state_hash, status FROM play.games
    WHERE id = ${lease.gameId} AND owner_id = ${lease.ownerId} AND fence = ${lease.fence}
      AND lease_until > clock_timestamp() FOR UPDATE`;
  if (!rows.length) throw new StorageError('owner-lost');
  return rows[0]!;
}

/** Private service adapter. The caller owns a dedicated bounded connection pool.
 * It never imports the web app, reads credentials, or publishes client messages. */
export class PostgresGameStore {
  constructor(private readonly sql: Sql) {}

  async create(checkpoint: string): Promise<void> {
    await this.sql.begin(tx => insertGame(tx, checkpoint));
  }

  async claim(gameId: string, ownerId: string, leaseMs: number): Promise<Lease | null> {
    id.parse(gameId);
    id.parse(ownerId);
    z.number().int().min(10).max(60_000).parse(leaseMs);
    const rows = await this.sql`
      UPDATE play.games SET owner_id = ${ownerId}, fence = fence + 1,
        lease_until = clock_timestamp() + ${leaseMs} * interval '1 millisecond'
      WHERE id = ${gameId} AND status <> 'abandoned' AND (owner_id IS NULL OR lease_until <= clock_timestamp())
      RETURNING fence`;
    return rows[0] ? { gameId, ownerId, fence: rows[0].fence } : null;
  }

  async renew(raw: Lease, leaseMs: number): Promise<void> {
    const lease = leaseSchema.parse(raw);
    z.number().int().min(10).max(60_000).parse(leaseMs);
    const rows = await this.sql`
      UPDATE play.games SET lease_until = clock_timestamp() + ${leaseMs} * interval '1 millisecond'
      WHERE id = ${lease.gameId} AND owner_id = ${lease.ownerId} AND fence = ${lease.fence}
        AND status <> 'abandoned' AND lease_until > clock_timestamp() RETURNING id`;
    if (!rows.length) throw new StorageError('owner-lost');
  }

  async release(raw: Lease): Promise<void> {
    const lease = leaseSchema.parse(raw);
    await this.sql`UPDATE play.games SET owner_id = NULL, lease_until = NULL
      WHERE id = ${lease.gameId} AND owner_id = ${lease.ownerId} AND fence = ${lease.fence}`;
  }

  async findReceipt(gameId: string, actorId: string, commandId: string): Promise<Receipt | null> {
    [gameId, actorId, commandId].forEach(value => id.parse(value));
    const rows = await this.sql`SELECT sequence, revision, request_hash FROM play.journal_live
      WHERE game_id = ${gameId} AND actor_id = ${actorId} AND command_id = ${commandId}`;
    if (rows[0]) return receipt(rows[0]);
    const history = await this.archived(gameId);
    const found = history?.journal.find(e => e.actorId === actorId && e.commandId === commandId);
    return found
      ? { sequence: found.sequence, revision: found.revision, requestHash: found.requestHash }
      : null;
  }

  async archived(gameId: string): Promise<History | null> {
    const [row] = await this.sql`SELECT * FROM play.journal_history WHERE game_id = ${gameId}`;
    return row ? readArchiveRow(row, gameId) : null;
  }

  async append(
    rawLease: Lease,
    raw: Append,
    authorize?: CommitAuthorization,
  ): Promise<Receipt & { duplicate: boolean }> {
    const lease = leaseSchema.parse(rawLease);
    const entry = appendSchema.parse(raw);
    if (
      entry.revision <= entry.fromRevision ||
      (entry.control
        ? entry.inputs.length !== 0 || entry.facts.length !== 0 || !entry.checkpoint
        : entry.inputs.length === 0) ||
      (entry.timeline && entry.timeline.sequence !== entry.expectedSequence + 1) ||
      Buffer.byteLength(JSON.stringify(entry)) > 8_388_608
    )
      throw new StorageError('stale-state');
    if (entry.checkpoint !== undefined) {
      const meta = checkpointMetadata(entry.checkpoint);
      if (
        meta.gameId !== lease.gameId ||
        meta.revision !== entry.revision ||
        stateDigest(entry.checkpoint) !== entry.stateHash
      )
        throw new StorageError('invalid-checkpoint');
    }
    return this.sql.begin(async tx => {
      const game = await owned(tx, lease);
      if (authorize && !(await authorize(tx))) throw new StorageError('not-authorized');
      const prior = await tx`SELECT sequence, revision, request_hash FROM play.journal_live
        WHERE game_id = ${lease.gameId} AND actor_id = ${entry.actorId} AND command_id = ${entry.commandId}`;
      if (prior[0]) {
        if (prior[0].request_hash !== entry.requestHash) throw new StorageError('command-conflict');
        return { ...receipt(prior[0]), duplicate: true };
      }
      if (game.status !== 'running') {
        const [archived] =
          await tx`SELECT * FROM play.journal_history WHERE game_id = ${lease.gameId}`;
        const old =
          archived &&
          (await readArchiveRow(archived, lease.gameId)).journal.find(
            e => e.actorId === entry.actorId && e.commandId === entry.commandId,
          );
        if (old) {
          if (old.requestHash !== entry.requestHash) throw new StorageError('command-conflict');
          return {
            sequence: old.sequence,
            revision: old.revision,
            requestHash: old.requestHash,
            duplicate: true,
          };
        }
        throw new StorageError('sealed-game');
      }
      const [exit] = await tx`SELECT request_id, seat FROM play.match_exits
        WHERE game_id = ${lease.gameId} AND status = 'pending'`;
      if (
        exit &&
        (entry.commandId !== exit.request_id || entry.actorId !== exit.seat || !entry.summary)
      )
        throw new StorageError('exit-pending');
      if (
        !entry.inputs.some(
          input =>
            input && typeof input === 'object' && !Array.isArray(input) && input.type === 'concede',
        ) &&
        !entry.control &&
        (
          await tx`SELECT id FROM play.undo_requests WHERE game_id = ${lease.gameId} AND status = 'pending' AND expires_at > clock_timestamp()`
        ).length
      )
        throw new StorageError('undo-pending');
      if (game.sequence !== entry.expectedSequence || game.revision !== entry.fromRevision)
        throw new StorageError('stale-state');
      if (
        entry.checkpoint !== undefined &&
        !sameVersions(checkpointMetadata(entry.checkpoint).versions, game.versions)
      )
        throw new StorageError('invalid-checkpoint');
      const sequence = game.sequence + 1;
      await tx`INSERT INTO play.journal_live
        (game_id, sequence, actor_id, command_id, request_hash, from_revision, revision, state_hash, inputs, facts, timeline, control)
        VALUES (${lease.gameId}, ${sequence}, ${entry.actorId}, ${entry.commandId}, ${entry.requestHash},
          ${entry.fromRevision}, ${entry.revision}, ${entry.stateHash}, ${tx.json(entry.inputs)}, ${tx.json(entry.facts)},
          ${entry.timeline ? tx.json(entry.timeline) : null}, ${entry.control ? tx.json(entry.control) : null})`;
      if (entry.checkpoint !== undefined) {
        await tx`INSERT INTO play.checkpoints (game_id, sequence, revision, state_hash, checkpoint)
          VALUES (${lease.gameId}, ${sequence}, ${entry.revision}, ${entry.stateHash}, ${entry.checkpoint})`;
        await tx`DELETE FROM play.checkpoints WHERE game_id = ${lease.gameId}
          AND sequence > 0 AND sequence < ${sequence}`;
      }
      if (entry.summary)
        await tx`UPDATE play.undo_requests SET status = 'expired' WHERE game_id = ${lease.gameId} AND status = 'pending'`;
      const rows =
        await tx`UPDATE play.games SET sequence = ${sequence}, revision = ${entry.revision},
        state_hash = ${entry.stateHash},
        status = ${entry.summary ? 'ended' : 'running'},
        summary = ${entry.summary ? tx.json(entry.summary) : null},
        ended_at = CASE WHEN ${!!entry.summary} THEN clock_timestamp() ELSE NULL END,
        updated_at = clock_timestamp()
        WHERE id = ${lease.gameId} AND owner_id = ${lease.ownerId} AND fence = ${lease.fence}
          AND status <> 'abandoned' AND lease_until > clock_timestamp() RETURNING id`;
      if (!rows.length) throw new StorageError('owner-lost');
      if (entry.summary) {
        await tx`UPDATE play.match_exits SET status = 'forfeit', closed_at = clock_timestamp()
          WHERE game_id = ${lease.gameId} AND status = 'pending'`;
        await notifyGame(tx, lease.gameId);
      }
      return {
        sequence,
        revision: entry.revision,
        requestHash: entry.requestHash,
        duplicate: false,
      };
    });
  }

  /** One MVCC snapshot prevents compaction or appends tearing head/history reads. */
  async load(gameId: string): Promise<Recovery> {
    return this.#read(gameId, false);
  }
  async readHistory(gameId: string): Promise<History> {
    return this.#read(gameId, true);
  }
  async historySource(gameId: string) {
    id.parse(gameId);
    const [game] = await this.sql`SELECT history_key FROM play.games WHERE id = ${gameId}`;
    if (!game) throw new StorageError('missing-game');
    return { history: await this.readHistory(gameId), key: game.history_key as string };
  }
  async #read(gameId: string, initial: boolean): Promise<History> {
    id.parse(gameId);
    return this.sql.begin('isolation level repeatable read read only', async tx => {
      const [game] =
        await tx`SELECT versions, sequence, revision, state_hash, summary, status FROM play.games WHERE id = ${gameId}`;
      if (!game) throw new StorageError('missing-game');
      if (!(await loadGameVersions(tx, game.versions)))
        throw new Error('Incompatible Crossfire history');
      if (game.status === 'finalized') {
        const [row] = await tx`SELECT * FROM play.journal_history WHERE game_id = ${gameId}`;
        if (!row) throw new StorageError('invalid-checkpoint');
        const history = await readArchiveRow(row, gameId);
        if (
          history.sequence !== game.sequence ||
          history.stateHash !== game.state_hash ||
          !sameVersions(history.versions, game.versions)
        )
          throw new StorageError('invalid-checkpoint');
        return history;
      }
      const [checkpoint] = initial
        ? await tx`SELECT sequence, revision, state_hash, checkpoint FROM play.checkpoints WHERE game_id = ${gameId} AND sequence = 0`
        : await tx`SELECT sequence, revision, state_hash, checkpoint FROM play.checkpoints WHERE game_id = ${gameId} ORDER BY sequence DESC LIMIT 1`;
      if (!checkpoint) throw new StorageError('invalid-checkpoint');
      const [size] =
        await tx`SELECT count(*)::int AS count, coalesce(sum(octet_length(inputs::text) + octet_length(facts::text)), 0)::bigint AS bytes
        FROM play.journal_live WHERE game_id = ${gameId} AND sequence > ${checkpoint.sequence}`;
      if (size!.count > 10_000 || Number(size!.bytes) > 64 * 1024 * 1024)
        throw new Error('Crossfire history capacity');
      const journal = await tx`SELECT sequence, actor_id, command_id, request_hash, from_revision,
        revision, state_hash, inputs, facts, timeline, control FROM play.journal_live
        WHERE game_id = ${gameId} AND sequence > ${checkpoint.sequence} ORDER BY sequence`;
      return {
        gameId,
        versions: bundleVersionsSchema.parse(game.versions),
        sequence: game.sequence,
        revision: game.revision,
        stateHash: game.state_hash,
        summary: game.summary ? summarySchema.parse(game.summary) : null,
        checkpoint: {
          sequence: checkpoint.sequence,
          revision: checkpoint.revision,
          stateHash: checkpoint.state_hash,
          checkpoint: checkpoint.checkpoint,
        },
        journal: journal.map(row => ({
          ...receipt(row),
          actorId: row.actor_id,
          commandId: row.command_id,
          fromRevision: row.from_revision,
          stateHash: row.state_hash,
          inputs: row.inputs,
          facts: row.facts,
          ...(row.timeline ? { timeline: timelineSchema.parse(row.timeline) } : {}),
          ...(row.control ? { control: undoControlSchema.parse(row.control) } : {}),
        })),
      };
    });
  }

  /** Already verified archive only; exact sealed-head comparison protects racing
   * finalizers. The archive and deletion become visible in the same commit. */
  async publishArchive(gameId: string, archive: Archive): Promise<boolean> {
    const decoded = await decodeArchive(archive);
    const verified = verifyHistory(decoded);
    if (decoded.gameId !== gameId || !verified.state.result || !decoded.summary)
      throw new StorageError('invalid-checkpoint');
    return this.sql.begin(async tx => {
      const [game] =
        await tx`SELECT status, sequence, state_hash, versions, summary FROM play.games WHERE id = ${gameId} FOR UPDATE`;
      if (!game || game.sequence !== archive.sequence || game.state_hash !== archive.stateHash)
        throw new StorageError('stale-state');
      if (
        !sameVersions(game.versions, decoded.versions) ||
        stateDigest(JSON.stringify(game.summary)) !== stateDigest(JSON.stringify(decoded.summary))
      )
        throw new StorageError('invalid-checkpoint');
      if (game.status === 'finalized') return false;
      if (game.status !== 'ended') throw new StorageError('sealed-game');
      await tx`INSERT INTO play.journal_history (game_id, format, sequence, state_hash, payload_hash, raw_bytes, payload)
        VALUES (${gameId}, ${archive.format}, ${archive.sequence}, ${archive.stateHash}, ${archive.payloadHash}, ${archive.rawBytes}, ${archive.payload})`;
      await tx`DELETE FROM play.undo_requests WHERE game_id = ${gameId}`;
      await tx`DELETE FROM play.journal_live WHERE game_id = ${gameId}`;
      await tx`DELETE FROM play.checkpoints WHERE game_id = ${gameId}`;
      await tx`UPDATE play.games SET status = 'finalized', updated_at = clock_timestamp() WHERE id = ${gameId}`;
      return true;
    });
  }
}

/** Shared transaction boundary for atomic seat admission and initial state. */
export async function insertGame(tx: TransactionSql, checkpoint: string): Promise<void> {
  const meta = checkpointMetadata(checkpoint);
  const digest = stateDigest(checkpoint);
  await tx`INSERT INTO play.games (id, versions, revision, state_hash)
    VALUES (${meta.gameId}, ${tx.json(meta.versions)}, ${meta.revision}, ${digest})`;
  await tx`INSERT INTO play.checkpoints (game_id, sequence, revision, state_hash, checkpoint)
    VALUES (${meta.gameId}, 0, ${meta.revision}, ${digest}, ${checkpoint})`;
}

async function readArchiveRow(row: Record<string, any>, gameId: string): Promise<History> {
  const history = await decodeArchive({
    format: row.format,
    sequence: row.sequence,
    stateHash: row.state_hash,
    payloadHash: row.payload_hash,
    rawBytes: row.raw_bytes,
    payload: row.payload,
  });
  if (history.gameId !== gameId) throw new StorageError('invalid-checkpoint');
  return history;
}
