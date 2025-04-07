import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { and, eq, sql } from 'drizzle-orm';
import {
  fetchDecklistView,
  fetchDeckMatchesWithMeleeDeckIds,
  fetchRoundStandings,
  fetchTournamentView,
  parseStandingsToTournamentDeck,
} from './tournamentImportLib.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentMatch, type TournamentMatchInsert } from '../../db/schema/tournament_match.ts';
import { deckCard as deckCardTable } from '../../db/schema/deck_card.ts';
import { entityResource, type EntityResourceInsert } from '../../db/schema/entity_resource.ts';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { parseTextToSwubase } from '../decks/deckConverterService.tsx';
import { cardList } from '../../db/lists.ts';
import { updateDeckInformation } from '../decks/updateDeckInformation.ts';

export async function runTournamentImport(tournamentId: string) {
  const t = (await db.select().from(tournament).where(eq(tournament.id, tournamentId)))[0];

  const meleeTournamentId = t.meleeId;
  console.log('Melee tournament id: ', meleeTournamentId);
  if (!meleeTournamentId) throw new Error('Melee tournament ID is empty');

  const roundId = await fetchTournamentView(meleeTournamentId);
  console.log('Round id: ', roundId);
  if (!roundId) throw new Error('Round ID is empty');

  const roundStandings = await fetchRoundStandings(roundId);
  console.log('Standing count: ', roundStandings.length);

  let tournamentDecks = await db
    .select()
    .from(tournamentDeck)
    .where(eq(tournamentDeck.tournamentId, t.id));

  const parsedStandings = roundStandings.map(s =>
    parseStandingsToTournamentDeck(s, t, tournamentDecks),
  );

  const playerInfo: Record<
    string,
    {
      deckId: string;
      meleeDeckId: string;
      matches: TournamentMatchInsert[];
    }
  > = {};

  tournamentDecks.forEach(td => {
    if (!td.meleePlayerUsername) {
      throw new Error('Melee player username is empty');
    }
    playerInfo[td.meleePlayerUsername] = {
      deckId: td.deckId,
      meleeDeckId: td.meleeDecklistGuid ?? '',
      matches: [],
    };
  });

  console.log(parsedStandings);

  console.log('==================================');
  for (const d of parsedStandings) {
    if (d.exists) {
      if (d.tournamentDeck.deckId === '') {
        throw new Error('Deck ID is empty but it is supposed to exist');
      }
      await db.delete(deckCardTable).where(eq(deckCardTable.deckId, d.tournamentDeck.deckId));
      await db.delete(entityResource).where(eq(entityResource.entityId, d.tournamentDeck.deckId));
      console.log(
        'Deck existed - deleted deck cards and resources for deck ' + d.tournamentDeck.deckId,
      );
    } else {
      const newDeck = await db
        .insert(deckTable)
        .values({
          userId: 'swubase',
          format: t.format,
          name: d.decklistName,
        })
        .returning();

      const newDeckId = newDeck[0].id;
      console.log('Created new deck ' + newDeckId);
      d.tournamentDeck.deckId = newDeckId;
      if (d.tournamentDeck.meleePlayerUsername) {
        playerInfo[d.tournamentDeck.meleePlayerUsername] = {
          deckId: newDeckId,
          meleeDeckId: d.tournamentDeck.meleeDecklistGuid ?? '',
          matches: [],
        };
      }
    }

    const resources: EntityResourceInsert[] = [
      {
        entityType: 'deck',
        entityId: d.tournamentDeck.deckId,
        resourceType: 'tournament-link',
        resourceUrl: `${process.env.VITE_BETTER_AUTH_URL}/tournaments/${t.id}`,
        title: 'Tournament',
      },
      {
        entityType: 'deck',
        entityId: d.tournamentDeck.deckId,
        resourceType: 'melee',
        resourceUrl: `https://melee.gg/Tournament/View/${meleeTournamentId}`,
        title: 'Melee tournament',
      },
      {
        entityType: 'deck',
        entityId: d.tournamentDeck.deckId,
        resourceType: 'melee',
        resourceUrl: `https://melee.gg/Decklist/View/${d.tournamentDeck.meleeDecklistGuid}`,
        title: 'Melee decklist',
      },
    ];

    await db.insert(entityResource).values(resources);

    const newTournamentDeck = await db
      .insert(tournamentDeck)
      .values({ ...d.tournamentDeck })
      .onConflictDoUpdate({
        target: [tournamentDeck.tournamentId, tournamentDeck.deckId],
        set: {
          ...d.tournamentDeck,
        },
      })
      .returning();

    console.log('Created new tournament deck ' + newTournamentDeck[0].deckId);

    if (!d.tournamentDeck.meleePlayerUsername || d.tournamentDeck.meleePlayerUsername === '') {
      console.warn('Melee player username is empty');
    } else if (!d.tournamentDeck.meleeDecklistGuid || d.tournamentDeck.meleeDecklistGuid === '') {
      console.warn('Melee decklist GUID is empty');
    } else {
      const decklistText = await fetchDecklistView(d.tournamentDeck.meleeDecklistGuid);
      if (decklistText) {
        const cards = parseTextToSwubase(decklistText, cardList, d.tournamentDeck.deckId);

        console.log(`Updating leader and base to: ${cards.leader1} ${cards.leader2} ${cards.base}`);
        await db
          .update(deckTable)
          .set({
            leaderCardId1: cards.leader1,
            leaderCardId2: cards.leader2,
            baseCardId: cards.base,
          })
          .where(eq(deckTable.id, d.tournamentDeck.deckId));
        await updateDeckInformation(d.tournamentDeck.deckId);

        console.log(`Inserting deck cards: ${cards.deckCards.length} rows`);
        await db.insert(deckCardTable).values(cards.deckCards);
      }

      playerInfo[d.tournamentDeck.meleePlayerUsername].matches =
        await fetchDeckMatchesWithMeleeDeckIds(
          d.tournamentDeck.meleeDecklistGuid,
          t.id,
          d.tournamentDeck.meleePlayerUsername,
        );
    }
  }

  console.log('Going to prepare matches with Swubase deck IDs...');
  const insertedMatches = new Set<string>();
  const matchesWithSwubaseDeckIds: TournamentMatchInsert[] = [];
  Object.entries(playerInfo).forEach(([username, info]) => {
    info.matches.forEach(async match => {
      const key1 = `${match.round}-${match.p1Username}-${match.p2Username}`;
      const key2 = `${match.round}-${match.p2Username}-${match.p1Username}`;
      if (insertedMatches.has(key1) || insertedMatches.has(key2)) {
        return;
      }
      insertedMatches.add(key1);
      insertedMatches.add(key2);

      const newMatch: TournamentMatchInsert = {
        ...match,
        p1DeckId: playerInfo[match.p1Username].deckId,
        p2DeckId: match.p2Username ? playerInfo[match.p2Username]?.deckId : null,
        p2Points: match.p2Username
          ? playerInfo[match.p2Username]?.matches?.find(m => m.round === match.round)?.p1Points
          : null,
      };

      matchesWithSwubaseDeckIds.push(newMatch);
    });
  });

  console.log('Inserting matches with Swubase deck IDs...');
  await db.delete(tournamentMatch).where(eq(tournamentMatch.tournamentId, t.id));
  await db.insert(tournamentMatch).values(matchesWithSwubaseDeckIds);
  await db
    .update(deckTable)
    .set({
      public: true,
      updatedAt: sql`NOW()`,
    })
    .from(tournamentDeck)
    .where(and(eq(deckTable.id, tournamentDeck.deckId), eq(tournamentDeck.tournamentId, t.id)));
}
