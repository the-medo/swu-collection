import type { TransactionSql } from 'postgres';

export const invitationChannel = 'crossfire_invitations';
/** PostgreSQL delivers NOTIFY only after commit. Payloads never contain decks. */
export async function notifyInvitation(tx: TransactionSql, lobbyId: string) {
  const [row] = await tx`SELECT l.creator_user_id, i.recipient_user_id
    FROM play.lobbies l LEFT JOIN play.invitations i ON i.lobby_id = l.id WHERE l.id = ${lobbyId}`;
  if (!row) return;
  await tx`SELECT pg_notify(${invitationChannel}, ${JSON.stringify({
    lobbyId,
    users: [row.creator_user_id, row.recipient_user_id].filter(Boolean),
  })})`;
}
