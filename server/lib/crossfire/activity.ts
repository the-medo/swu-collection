import type { TransactionSql } from 'postgres';

/** For authorized activity queries with lobby alias `l`. Extract only public
 * leader identities in SQL; never select or return the full frozen decks. */
export function activityLeaders(tx: TransactionSql, viewerId: string) {
  return tx`(SELECT jsonb_agg(p.deck_snapshot ->> 'leader'
    ORDER BY (p.user_id IS DISTINCT FROM ${viewerId}), p.seat)
    FROM play.participants p WHERE p.lobby_id = l.id)`;
}
