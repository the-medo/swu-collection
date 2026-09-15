import type { Sql } from 'postgres';
import { z } from 'zod';
import { AdmissionError, principalSchema, requireSession } from './lobbies.ts';
import type { Principal } from './lobbies.ts';
import {
  crossfireDeckBrowserQuery,
  type CrossfireDeckBrowserQuery,
  type CrossfireDeckPage,
  type CrossfireDeckSummary,
} from '../../../shared/types/crossfire-decks.ts';

const cursorSchema = z.strictObject({ date: z.iso.datetime(), id: z.uuid() });
export class DeckBrowserRequestError extends Error {}
type Catalog = Readonly<Record<string, { name: string; subtitle?: string | null; type: string }>>;

/** Bounded account-aware discovery, using the same access predicates as deck admission. */
export class CrossfireDecks {
  private readonly titles: { id: string; title: string }[];
  constructor(
    private readonly sql: Sql,
    catalog: Catalog,
  ) {
    this.titles = Object.entries(catalog)
      .filter(([, card]) => card.type === 'Leader' || card.type === 'Base')
      .map(([id, card]) => ({ id, title: `${card.name} ${card.subtitle ?? ''}`.toLowerCase() }));
  }

  list(raw: Principal, input: CrossfireDeckBrowserQuery): Promise<CrossfireDeckPage> {
    return this.read(raw, crossfireDeckBrowserQuery.parse(input));
  }

  async get(raw: Principal, deckId: string): Promise<CrossfireDeckSummary> {
    const result = await this.read(raw, { source: 'mine', search: '' }, z.uuid().parse(deckId));
    if (!result.data[0]) throw new AdmissionError('deck-unavailable');
    return result.data[0];
  }

  private async read(
    raw: Principal,
    query: CrossfireDeckBrowserQuery,
    deckId?: string,
  ): Promise<CrossfireDeckPage> {
    const principal = principalSchema.parse(raw);
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (query.cursor) {
      try {
        cursor = cursorSchema.parse(
          JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')),
        );
      } catch {
        throw new DeckBrowserRequestError('Invalid deck cursor');
      }
    }
    const search = query.search.toLowerCase();
    const identities = search
      ? this.titles.filter(card => card.title.includes(search)).map(c => c.id)
      : [];
    // A search is literal, including SQL wildcard characters typed by the player.
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, principal);
      const recent = !deckId && query.source === 'recent';
      const publicOnly = !deckId && query.source === 'public';
      const sort = recent
        ? tx`r.played_at AT TIME ZONE 'UTC'`
        : query.source === 'mine'
          ? tx`d.created_at`
          : tx`d.updated_at`;
      const rows = await tx`
        ${
          recent
            ? tx`WITH recent AS (
          SELECT own.deck_snapshot->>'sourceDeckId' AS deck_id, max(l.created_at) AS played_at
          FROM play.participants own JOIN play.lobbies l ON l.id = own.lobby_id
          WHERE own.user_id = ${principal.userId} AND l.status = 'started'
          GROUP BY own.deck_snapshot->>'sourceDeckId'
        )`
            : tx``
        }
        SELECT d.id, d.name, d.leader_card_id_1, d.base_card_id,
          coalesce(u.display_name, u.name, 'Player') AS author,
          to_char(${sort}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS sort_date
        FROM public.deck d
        JOIN public."user" u ON u.id = d.user_id
        ${recent ? tx`JOIN recent r ON r.deck_id = d.id::text` : tx``}
        WHERE ${
          publicOnly
            ? tx`d.public = 1`
            : deckId || recent
              ? tx`(d.user_id = ${principal.userId} OR d.public IN (1, 2))`
              : tx`d.user_id = ${principal.userId}`
        }
        AND (d.card_pool_id IS NULL OR EXISTS (
          SELECT 1 FROM public.card_pool_decks cp WHERE cp.deck_id = d.id
          AND cp.card_pool_id = d.card_pool_id AND cp.user_id = d.user_id
          AND ${
            publicOnly
              ? tx`cp.visibility = 'public'`
              : tx`(cp.user_id = ${principal.userId} OR cp.visibility IN ('public', 'unlisted'))`
          }
        ))
        ${deckId ? tx`AND d.id = ${deckId}` : tx``}
        ${
          search
            ? tx`AND (lower(d.name) LIKE ${pattern}
          OR d.leader_card_id_1 = ANY(${identities}::text[])
          OR d.leader_card_id_2 = ANY(${identities}::text[])
          OR d.base_card_id = ANY(${identities}::text[]))`
            : tx``
        }
        ${cursor ? tx`AND (${sort}, d.id) < (${cursor.date}::text::timestamp, ${cursor.id}::uuid)` : tx``}
        ORDER BY ${sort} DESC, d.id DESC LIMIT 21`;
      const page = rows.slice(0, 20);
      const last = page[page.length - 1];
      return {
        data: page.map(row => ({
          id: row.id,
          name: row.name,
          leaderId: row.leader_card_id_1,
          baseId: row.base_card_id,
          author: row.author,
        })),
        nextCursor:
          rows.length > 20 && last
            ? Buffer.from(JSON.stringify({ date: last.sort_date, id: last.id })).toString(
                'base64url',
              )
            : null,
      };
    });
  }
}
