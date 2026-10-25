import { randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import { z } from 'zod';
import type { ChatMessage } from '../../../play/view/chat.ts';
import { chatTextSchema } from '../../../play/view/chat.ts';
import { ConnectionError, requireConnection } from './connections.ts';
import type { ConnectionGrant } from './connections.ts';
export class ChatError extends Error {
  constructor(readonly code: 'rate-limited' | 'chat-full' | 'conflict') {
    super(code);
  }
}
const message = (row: Record<string, any>): ChatMessage => ({
  id: row.id,
  sequence: row.sequence,
  seat: row.seat,
  text: row.text,
  createdAt: row.created_at.toISOString(),
  afterEvent: row.after_event ?? null,
});
export class CrossfireChat {
  constructor(private readonly sql: Sql) {}
  private player(grant: ConnectionGrant) {
    if (grant.role !== 'player' || grant.purpose !== 'live') throw new ConnectionError('denied');
  }
  async list(grant: ConnectionGrant): Promise<ChatMessage[]> {
    this.player(grant);
    return this.sql.begin('read only', async tx => {
      await requireConnection(tx, grant);
      const rows = await tx`SELECT * FROM (
          (SELECT * FROM play.chat_messages WHERE game_id = ${grant.gameId} AND seat IS NOT NULL ORDER BY sequence DESC LIMIT 100)
          UNION ALL
          (SELECT * FROM play.chat_messages WHERE game_id = ${grant.gameId} AND seat IS NULL ORDER BY sequence DESC LIMIT 20)
        ) AS recent ORDER BY sequence DESC`;
      return rows.reverse().map(message);
    });
  }
  /** Server-authored notice, deduplicated across tabs and short reconnects. */
  async spectatorJoined(grant: ConnectionGrant, afterEvent: number): Promise<ChatMessage | null> {
    if (grant.role !== 'spectator' || grant.purpose !== 'live') throw new ConnectionError('denied');
    z.number().int().nonnegative().parse(afterEvent);
    return this.sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${grant.gameId}, 319))`;
      await requireConnection(tx, grant, true);
      const [recent] = await tx`SELECT id FROM play.chat_messages
        WHERE game_id = ${grant.gameId} AND spectator_user_id = ${grant.userId}
          AND created_at > clock_timestamp() - interval '30 seconds' LIMIT 1`;
      if (recent) return null;
      const [head] = await tx`SELECT coalesce(max(sequence),0)::int AS n
        FROM play.chat_messages WHERE game_id = ${grant.gameId}`;
      // Retain at most 20 notices separately from the player's 500-message budget.
      // Keep the current head until after choosing the next sequence.
      await tx`DELETE FROM play.chat_messages WHERE game_id = ${grant.gameId} AND seat IS NULL
        AND id NOT IN (SELECT id FROM play.chat_messages WHERE game_id = ${grant.gameId}
          AND seat IS NULL ORDER BY sequence DESC LIMIT 19)`;
      const [user] = await tx`SELECT display_name FROM public."user" WHERE id = ${grant.userId}`;
      const name =
        String(user?.display_name ?? '')
          .trim()
          .slice(0, 100) || 'A spectator';
      const [row] = await tx`INSERT INTO play.chat_messages
        (game_id,sequence,id,seat,spectator_user_id,text,created_at,after_event)
        VALUES (${grant.gameId},${head!.n + 1},${randomUUID()},NULL,${grant.userId},
          ${name + ' joined as a spectator.'},clock_timestamp(),${afterEvent}) RETURNING *`;
      return message(row!);
    });
  }
  async send(
    grant: ConnectionGrant,
    id: string,
    text: string,
    afterEvent?: number,
  ): Promise<ChatMessage> {
    this.player(grant);
    z.uuid().parse(id);
    text = chatTextSchema.parse(text);
    if (afterEvent !== undefined) z.number().int().nonnegative().parse(afterEvent);
    return this.sql.begin(async tx => {
      // Separate from the game row lock; chat never holds up the rules queue.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${grant.gameId}, 319))`;
      await requireConnection(tx, grant, true);
      const [old] =
        await tx`SELECT * FROM play.chat_messages WHERE game_id = ${grant.gameId} AND id = ${id}`;
      if (old) {
        if (old.seat !== grant.seat || old.text !== text) throw new ChatError('conflict');
        return message(old);
      }
      const [recent] =
        await tx`SELECT count(*)::int AS n FROM play.chat_messages WHERE game_id = ${grant.gameId} AND seat = ${grant.seat} AND created_at > clock_timestamp() - interval '10 seconds'`;
      if (recent!.n >= 5) throw new ChatError('rate-limited');
      const [head] =
        await tx`SELECT coalesce(max(sequence),0)::int AS n, count(*) FILTER (WHERE seat IS NOT NULL)::int AS players
          FROM play.chat_messages WHERE game_id = ${grant.gameId}`;
      if (head!.players >= 500) throw new ChatError('chat-full');
      const [row] =
        await tx`INSERT INTO play.chat_messages(game_id,sequence,id,seat,text,created_at,after_event) VALUES (${grant.gameId},${head!.n + 1},${id},${grant.seat},${text},clock_timestamp(),${afterEvent ?? null}) RETURNING *`;
      return message(row!);
    });
  }
}
