import type { TransactionSql } from 'postgres';

/** Invalidations only. PostgreSQL delivers these to API replicas after commit. */
export async function notifyGame(tx: TransactionSql, gameId: string) {
  const rows = await tx`SELECT l.id, p.user_id FROM play.lobbies l
    JOIN play.participants p ON p.lobby_id = l.id WHERE l.game_id = ${gameId}`;
  if (!rows.length) return;
  await tx`SELECT pg_notify('crossfire_invitations', ${JSON.stringify({
    kind: 'game',
    lobbyId: rows[0]!.id,
    users: rows.map(r => r.user_id).filter(Boolean),
  })})`;
}
