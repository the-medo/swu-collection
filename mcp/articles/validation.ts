import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../../server/lib/creators/types.ts';
import { deck } from '../../server/db/schema/deck.ts';
import { cardPools } from '../../server/db/schema/card_pool.ts';
import { userAlbum } from '../../server/db/schema/user_album.ts';
import { tournament } from '../../server/db/schema/tournament.ts';
import { tournamentGroup } from '../../server/db/schema/tournament_group.ts';
import { user } from '../../server/db/schema/auth-schema.ts';
import { articleCatalog } from './catalog.ts';
import type { PostDocument } from '../../shared/posts/content.ts';
import { insertionSchema, type Insertion } from '../../shared/posts/widgets.ts';

/** Public readability checks never return private resource metadata. */
export async function articleWidgetWarnings(database: Database, document: PostDocument) {
  const widgets: { value: Insertion; path: string }[] = [];
  const visit = (value: unknown, path: string) => {
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (node.type === 'swuBlock' || node.type === 'swuInline') {
      const widget = insertionSchema.parse(JSON.parse((node.props as { data: string }).data));
      widgets.push({ value: widget, path });
      if (widget.kind === 'matchup') visit(widget.notes, `${path}.notes`);
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
  };
  visit(document, 'body');
  const ids = (kind: string) => [
    ...new Set(
      widgets.flatMap(({ value }) => {
        if (kind === 'deck' && value.kind === 'decklist') return [value.deck.deckId];
        if (kind === 'album' && value.kind === 'album') return [value.albumId];
        if (kind === 'pool' && value.kind === 'pool') return [value.poolId];
        if (value.kind === 'meta-analysis' && value.scope === kind) return [value.id];
        if (kind === 'user' && value.kind === 'mention') return [value.user.id];
        return [];
      }),
    ),
  ];
  const [cards, decks, pools, albums, events, groups, users] = await Promise.all([
    articleCatalog(database)(),
    ids('deck').length
      ? database
          .select({ id: deck.id })
          .from(deck)
          .where(and(inArray(deck.id, ids('deck')), inArray(deck.public, [1, 2])))
      : [],
    ids('pool').length
      ? database
          .select({ id: cardPools.id })
          .from(cardPools)
          .where(
            and(
              inArray(cardPools.id, ids('pool')),
              inArray(cardPools.visibility, ['public', 'unlisted']),
              inArray(cardPools.type, ['sealed', 'prerelease']),
              eq(cardPools.status, 'ready'),
              isNull(cardPools.archivedAt),
            ),
          )
      : [],
    ids('album').length
      ? database
          .select({ id: userAlbum.id })
          .from(userAlbum)
          .where(
            and(
              inArray(userAlbum.id, ids('album')),
              inArray(userAlbum.visibility, ['public', 'unlisted']),
            ),
          )
      : [],
    ids('tournament').length
      ? database
          .select({ id: tournament.id })
          .from(tournament)
          .where(inArray(tournament.id, ids('tournament')))
      : [],
    ids('group').length
      ? database
          .select({ id: tournamentGroup.id })
          .from(tournamentGroup)
          .where(and(inArray(tournamentGroup.id, ids('group')), eq(tournamentGroup.visible, true)))
      : [],
    ids('user').length
      ? database
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.id, ids('user')))
      : [],
  ]);
  const has = (rows: { id: string }[], id: string) => rows.some(row => row.id === id);
  const warnings: { path: string; message: string }[] = [];
  for (const { value, path } of widgets) {
    let unavailable = false;
    if (value.kind === 'decklist') unavailable = !has(decks, value.deck.deckId);
    if (value.kind === 'pool') unavailable = !has(pools, value.poolId);
    if (value.kind === 'album') unavailable = !has(albums, value.albumId);
    if (value.kind === 'mention') unavailable = !has(users, value.user.id);
    if (value.kind === 'meta-analysis')
      unavailable = !has(value.scope === 'group' ? groups : events, value.id);
    const references =
      value.kind === 'card-image' || value.kind === 'card-link'
        ? [value.card]
        : value.kind === 'card-group'
          ? value.cards
          : [];
    for (const ref of references)
      if (
        !cards[ref.cardId] ||
        (ref.variantId && !Object.hasOwn(cards[ref.cardId]!.variants, ref.variantId))
      )
        unavailable = true;
    if (value.kind === 'matchup') {
      for (const id of [value.leftLeader, value.rightLeader])
        if (id && cards[id]?.type !== 'Leader') unavailable = true;
      for (const id of [value.leftBase, value.rightBase])
        if (id && cards[id]?.type !== 'Base') unavailable = true;
    }
    if (unavailable)
      warnings.push({
        path,
        message:
          'This widget contains a reference unavailable to public readers. It may be private, removed, or unsuitable for this widget. Its visibility will not change when the article is published.',
      });
  }
  return warnings;
}
