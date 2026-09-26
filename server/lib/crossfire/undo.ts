import type { Sql, TransactionSql } from 'postgres';
import { z } from 'zod';
import { encodeState } from '../../../play/engine/checkpoint.ts';
import { stateDigest, StorageError } from '../../../play/storage/postgres.ts';
import type { HistoryCache } from '../../../play/history/cache.ts';
import type { UndoPending } from '../../../play/view/undo.ts';
import { requireConnection } from './connections.ts';
import type { ConnectionGrant } from './connections.ts';

type Prepared = Awaited<ReturnType<HistoryCache['prepareUndo']>>;
function player(grant: ConnectionGrant) {
  if (grant.role !== 'player' || grant.purpose !== 'live') throw new StorageError('not-authorized');
  return grant;
}
export class CrossfireUndo {
  constructor(private readonly sql: Sql) {}
  async pending(gameId: string): Promise<UndoPending | null> {
    const [row] = await this.sql`SELECT id, requester, expires_at FROM play.undo_requests
      WHERE game_id = ${gameId} AND status = 'pending' AND expires_at > clock_timestamp()`;
    return row
      ? { id: row.id, requester: row.requester, expiresAt: row.expires_at.toISOString() }
      : null;
  }
  async request(raw: ConnectionGrant, id: string, prepared: Prepared) {
    const grant = player(raw);
    z.uuid().parse(id);
    await this.sql.begin(async tx => {
      const [game] =
        await tx`SELECT sequence,state_hash,status,mode FROM play.games WHERE id = ${grant.gameId} FOR UPDATE`;
      await requireConnection(tx, grant, true);
      if (game?.mode === 'ai') throw new StorageError('not-authorized');
      const [old] = await tx`SELECT game_id,requester FROM play.undo_requests WHERE id = ${id}`;
      if (old) {
        if (old.game_id !== grant.gameId || old.requester !== grant.seat)
          throw new StorageError('not-authorized');
        return;
      }
      if (
        !game ||
        game.status !== 'running' ||
        game.sequence !== prepared.head.cursor.sequence ||
        game.state_hash !== stateDigest(encodeState(prepared.head.state))
      )
        throw new StorageError('stale-state');
      await tx`UPDATE play.undo_requests SET status = 'expired' WHERE game_id = ${grant.gameId} AND status = 'pending' AND expires_at <= clock_timestamp()`;
      if (
        (
          await tx`SELECT id FROM play.undo_requests WHERE game_id = ${grant.gameId} AND status = 'pending'`
        ).length
      )
        throw new StorageError('undo-pending');
      const [count] =
        await tx`SELECT count(*)::int AS n FROM play.undo_requests WHERE game_id = ${grant.gameId}`;
      if (count!.n >= 100) throw new StorageError('undo-pending');
      await tx`INSERT INTO play.undo_requests (id,game_id,requester,sequence,state_hash,target,target_hash,expires_at)
        VALUES (${id},${grant.gameId},${grant.seat},${game.sequence},${game.state_hash},${prepared.target.cursor.sequence},
        ${stateDigest(encodeState(prepared.target.state))},clock_timestamp()+interval '60 seconds')`;
    });
    return this.pending(grant.gameId);
  }
  async get(raw: ConnectionGrant, id: string) {
    const grant = player(raw);
    z.uuid().parse(id);
    return this.sql.begin('read only', async tx => {
      await requireConnection(tx, grant);
      const [row] =
        await tx`SELECT requester,status FROM play.undo_requests WHERE game_id = ${grant.gameId} AND id = ${id}`;
      if (!row) throw new StorageError('not-authorized');
      return { requester: row.requester as 'p1' | 'p2', status: row.status as string };
    });
  }
  async dismiss(raw: ConnectionGrant, id: string, kind: 'decline' | 'cancel') {
    const grant = player(raw);
    z.uuid().parse(id);
    await this.sql.begin(async tx => {
      await tx`SELECT id FROM play.games WHERE id = ${grant.gameId} FOR UPDATE`;
      await requireConnection(tx, grant, true);
      const [row] =
        await tx`SELECT requester,status FROM play.undo_requests WHERE game_id = ${grant.gameId} AND id = ${id}`;
      if (!row || (kind === 'cancel') !== (row.requester === grant.seat))
        throw new StorageError('not-authorized');
      if (row.status === 'pending')
        await tx`UPDATE play.undo_requests SET status = ${kind === 'cancel' ? 'cancelled' : 'declined'} WHERE id = ${id}`;
    });
  }
  /** Called after game ownership/head lock, before the durable branch append. */
  async approve(
    tx: TransactionSql,
    raw: ConnectionGrant,
    id: string,
    prepared: Prepared,
  ): Promise<boolean> {
    const grant = player(raw);
    await requireConnection(tx, grant, true);
    const rows = await tx`UPDATE play.undo_requests SET status = 'accepted'
      WHERE game_id = ${grant.gameId} AND id = ${id} AND requester <> ${grant.seat}
        AND status = 'pending' AND expires_at > clock_timestamp()
        AND sequence = ${prepared.head.cursor.sequence} AND state_hash = ${stateDigest(encodeState(prepared.head.state))}
        AND target = ${prepared.target.cursor.sequence} AND target_hash = ${stateDigest(encodeState(prepared.target.state))}
      RETURNING id`;
    if (rows.length !== 1) throw new StorageError('stale-state');
    return true;
  }
}
