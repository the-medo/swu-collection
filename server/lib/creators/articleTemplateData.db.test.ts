// SWUBASE_TEMPLATE_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/creators/articleTemplateData.db.test.ts
import { expect, test } from 'bun:test';
import { randomInt } from 'node:crypto';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { format } from '../../db/schema/format.ts';
import { meta } from '../../db/schema/meta.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentType } from '../../db/schema/tournament_type.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentGroup } from '../../db/schema/tournament_group.ts';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { getArticleTemplateMeta } from './articleTemplateData.ts';

const enabled = process.env.SWUBASE_TEMPLATE_DB_TEST === '1';
if (enabled) {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
    throw new Error('Requires an isolated worktree database.');
}
test.skipIf(!enabled)(
  'meta sources enforce visibility, format, date, event type and actual decklist availability',
  async () => {
    const rollback = new Error('Rollback template fixtures');
    try {
      await db.transaction(async tx => {
        const userId = crypto.randomUUID(),
          formatId = randomInt(1_000_000, 1_500_000),
          metaId = randomInt(1_000_000, 1_500_000);
        const lowType = `template-${crypto.randomUUID()}`;
        const ids = Array.from({ length: 6 }, () => crypto.randomUUID());
        const decks = Array.from({ length: 5 }, () => crypto.randomUUID());
        const groupId = crypto.randomUUID(),
          hiddenId = crypto.randomUUID();
        await tx
          .insert(user)
          .values({
            id: userId,
            name: 'Template fixture',
            displayName: userId,
            email: `${userId}@example.invalid`,
            emailVerified: false,
            currency: 'USD',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        await tx.insert(format).values({ id: formatId, name: `Template ${formatId}` });
        await tx.insert(meta).values([
          {
            id: metaId,
            set: 'sor',
            name: 'Fixture meta',
            format: formatId,
            date: '2034-01-01',
            season: 1,
          },
          {
            id: metaId + 1,
            set: 'sor',
            name: 'Future meta',
            format: formatId,
            date: '2036-01-01',
            season: 2,
          },
        ]);
        await tx
          .insert(tournamentType)
          .values({ id: lowType, name: 'Below PQ', sortValue: 199, major: 0 });
        await tx
          .insert(tournament)
          .values(
            ids.map((id, i) => ({
              id,
              userId,
              type: i === 3 ? lowType : 'pq',
              location: 'Test',
              continent: 'Europe',
              name: `Event ${i}`,
              attendance: 32,
              format: i === 4 ? 1 : formatId,
              meta: metaId,
              days: 1,
              date: new Date(i === 2 ? '2036-01-01' : '2034-10-10'),
              imported: i !== 1,
            })),
          );
        await tx
          .insert(deck)
          .values(
            decks.map((id, i) => ({
              id,
              userId,
              format: formatId,
              public: i === 1 ? 0 : i === 2 ? 2 : 1,
              name: `Deck ${i}`,
              leaderCardId1: 'sabine-wren--galvanized-revolutionary',
              baseCardId: 'energy-conversion-lab',
            })),
          );
        await tx
          .insert(deckCard)
          .values(
            decks.map((id, i) => ({
              deckId: id,
              cardId: 'battlefield-marine',
              board: i === 3 ? 2 : 1,
              quantity: i === 4 ? 0 : 3,
            })),
          );
        await tx
          .insert(tournamentDeck)
          .values(
            ids.flatMap((id, i) =>
              (i === 0 ? decks : [decks[0]!]).map((deckId, index) => ({
                tournamentId: id,
                deckId,
                placement: index + 1,
                topRelativeToPlayerCount: false,
                recordWin: 2,
                recordLose: 1,
                recordDraw: 0,
                points: 6,
              })),
            ),
          );
        await tx.insert(tournamentGroup).values([
          { id: groupId, name: 'Public group' },
          { id: hiddenId, name: 'Hidden group', visible: false },
        ]);
        await tx
          .insert(tournamentGroupTournament)
          .values(ids.slice(0, 3).map(id => ({ groupId, tournamentId: id })));
        const now = new Date('2035-01-01T12:00:00Z');
        const current = await getArticleTemplateMeta(
          { scope: 'current', format: formatId },
          tx,
          now,
        );
        expect(current.source.name).toBe('Fixture meta');
        expect(current.events.map(e => e.id).sort()).toEqual([ids[0]!, ids[1]!, ids[5]!].sort());
        expect(current.deckCount).toBe(4); // Three public entries in event 0, one in event 5.
        expect(current.archetypes[0]!.count).toBe(4);
        expect(current.decklists).toHaveLength(2);
        expect(current.decklists.every(d => d.id === decks[0])).toBe(true);
        const group = await getArticleTemplateMeta({ scope: 'group', id: groupId }, tx, now);
        expect(group.events).toHaveLength(3);
        expect(group.deckCount).toBe(3); // Neither future nor unimported events contribute.
        expect(group.decklists).toHaveLength(1);
        const event = await getArticleTemplateMeta({ scope: 'tournament', id: ids[0]! }, tx, now);
        expect(event.deckCount).toBe(3);
        expect(event.decklists[0]!.placement).toBe(1);
        expect(
          (await getArticleTemplateMeta({ scope: 'tournament', id: ids[2]! }, tx, now)).deckCount,
        ).toBe(0);
        await expect(
          getArticleTemplateMeta({ scope: 'group', id: hiddenId }, tx, now),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          getArticleTemplateMeta({ scope: 'tournament', id: crypto.randomUUID() }, tx, now),
        ).rejects.toMatchObject({ status: 404 });
        expect(
          (await getArticleTemplateMeta({ scope: 'current', format: formatId + 1 }, tx, now))
            .deckCount,
        ).toBe(0);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  },
);
