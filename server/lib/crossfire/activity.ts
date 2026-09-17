import type { TransactionSql } from 'postgres';

/** For authorized activity queries with lobby alias `l`. Extract only public
 * card identities in SQL; never select or return the full frozen decks. */
function activityCards(tx: TransactionSql, viewerId: string, field: 'leader' | 'base') {
  return tx`(SELECT jsonb_agg(p.deck_snapshot ->> ${field}
    ORDER BY (p.user_id IS DISTINCT FROM ${viewerId}), p.seat)
    FROM play.participants p WHERE p.lobby_id = l.id)`;
}

export const activityLeaders = (tx: TransactionSql, viewerId: string) =>
  activityCards(tx, viewerId, 'leader');

export const activityBases = (tx: TransactionSql, viewerId: string) =>
  activityCards(tx, viewerId, 'base');
