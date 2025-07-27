import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { and, eq, sql, gte, lte } from 'drizzle-orm';
import {
  fetchDecklistView,
  fetchDeckMatchesWithMeleeDeckIds,
  fetchPlayerDetails,
  fetchRoundStandings,
  fetchTournamentView,
  type ParseStandingsAdditionalInfo,
  parseStandingsToTournamentDeck,
  type TIUserDecklistMap,
} from './tournamentImportLib.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentMatch, type TournamentMatchInsert } from '../../db/schema/tournament_match.ts';
import { deckCard as deckCardTable } from '../../db/schema/deck_card.ts';
import { entityResource, type EntityResourceInsert } from '../../db/schema/entity_resource.ts';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { parseTextToSwubase } from '../decks/deckConverterService.tsx';
import { cardList } from '../../db/lists.ts';
import { updateDeckInformation } from '../decks/updateDeckInformation.ts';

export async function runTournamentImport(
  tournamentId: string,
  forcedRoundId: string | undefined = '',
  minRound: number | undefined = undefined,
  maxRound: number | undefined = undefined,
) {
  // let hoverForDecklists = decklistsOnHoverOnly;
  const t = (await db.select().from(tournament).where(eq(tournament.id, tournamentId)))[0];

  const meleeTournamentId = t.meleeId;
  console.log('Melee tournament id: ', meleeTournamentId);
  if (!meleeTournamentId) throw new Error('Melee tournament ID is empty');

  let roundId: number | undefined;

  if (forcedRoundId && forcedRoundId !== '') {
    roundId = parseInt(forcedRoundId);
  } else {
    roundId = await fetchTournamentView(meleeTournamentId);
    console.log('Round id: ', roundId);
  }

  if (!roundId) throw new Error('Round ID is empty');

  const roundStandings = await fetchRoundStandings(roundId);
  console.log('Standing count: ', roundStandings.length);
  const standingsWithDecklistInfo = roundStandings.filter(s => s.Decklists?.length > 0);

  let userDecklistMap: TIUserDecklistMap = {};

  if (standingsWithDecklistInfo.length === 0) {
    console.log('No standings with decklist info, will try to do decklists on hover');

    let i = 0;
    let decklistFound = false;

    for (const standing of roundStandings) {
      i++;
      if (i > 8 && !decklistFound) {
        console.log('No decklist found after 8 standings, skipping decklist search');
        break;
      }

      const meleeUserId = standing.Team.Players[0].ID;
      if (meleeUserId) {
        const playerData = await fetchPlayerDetails(meleeUserId);
        if (playerData) {
          decklistFound = true;
          userDecklistMap[meleeUserId] = playerData?.decklists?.[0];
        }
      } else {
        console.log(`No user ID found in standing, skipping`);
      }
    }
  }

  let tournamentDecks = await db
    .select()
    .from(tournamentDeck)
    .where(eq(tournamentDeck.tournamentId, t.id));

  let additionalInfo: ParseStandingsAdditionalInfo = {
    skippedStandings: [],
  };

  const parsedStandings = roundStandings
    .map(s =>
      parseStandingsToTournamentDeck(s, t, tournamentDecks, additionalInfo, userDecklistMap),
    )
    .filter(x => !!x);

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
      console.warn('Melee player username is empty');
      return;
    }
    playerInfo[td.meleePlayerUsername] = {
      deckId: td.deckId,
      meleeDeckId: td.meleeDecklistGuid ?? '',
      matches: [],
    };
  });

  console.log(parsedStandings);

  console.log('==================================');

  const deleteExistingDecks = !minRound && !maxRound;
  const importDeckCards = !minRound && !maxRound;

  for (const d of parsedStandings) {
    console.log('D: ', d.tournamentDeck.deckId);
    if (d.exists) {
      if (d.tournamentDeck.deckId === '') {
        console.warn('Deck ID is empty but it is supposed to exist');
        continue;
      }
      if (deleteExistingDecks) {
        await db.delete(deckCardTable).where(eq(deckCardTable.deckId, d.tournamentDeck.deckId));
        await db.delete(entityResource).where(eq(entityResource.entityId, d.tournamentDeck.deckId));
        console.log(
          'Deck existed - deleted deck cards and resources for deck ' + d.tournamentDeck.deckId,
        );
      } else {
        await db
          .update(tournamentDeck)
          .set({
            placement: d.tournamentDeck.placement,
            recordWin: d.tournamentDeck.recordWin,
            recordLose: d.tournamentDeck.recordLose,
            recordDraw: d.tournamentDeck.recordDraw,
            points: d.tournamentDeck.points,
          })
          .where(eq(tournamentDeck.deckId, d.tournamentDeck.deckId));
        console.log('Deck existed - updated placement, point and record info');
      }
    } else {
      console.log('Creating deck - ', d.decklistName);
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
    ];

    if (d.tournamentDeck.meleeDecklistGuid && d.tournamentDeck.meleeDecklistGuid !== '') {
      resources.push({
        entityType: 'deck',
        entityId: d.tournamentDeck.deckId,
        resourceType: 'melee',
        resourceUrl: `https://melee.gg/Decklist/View/${d.tournamentDeck.meleeDecklistGuid}`,
        title: 'Melee decklist',
      });
    }

    await db.insert(entityResource).values(resources).onConflictDoNothing();

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
      if (importDeckCards) {
        const decklistText = await fetchDecklistView(d.tournamentDeck.meleeDecklistGuid);
        if (decklistText && decklistText !== '') {
          const cards = parseTextToSwubase(decklistText, cardList, d.tournamentDeck.deckId);

          console.log(
            `Updating leader and base to: ${cards.leader1} ${cards.leader2} ${cards.base}`,
          );
          await db
            .update(deckTable)
            .set({
              leaderCardId1: cards.leader1,
              leaderCardId2: cards.leader2,
              baseCardId: cards.base,
            })
            .where(eq(deckTable.id, d.tournamentDeck.deckId));
          await updateDeckInformation(d.tournamentDeck.deckId);

          try {
            console.log(`Inserting deck cards: ${cards.deckCards.length} rows`);
            await db.insert(deckCardTable).values(cards.deckCards);
          } catch (error) {
            console.warn('Error inserting deck cards:', error);
          }
        }
      }

      if (d.tournamentDeck.meleePlayerUsername) {
        //if username exists in playerInfo (player could change it in the meantime probably?)
        if (playerInfo[d.tournamentDeck.meleePlayerUsername]) {
          playerInfo[d.tournamentDeck.meleePlayerUsername].matches =
            await fetchDeckMatchesWithMeleeDeckIds(
              d.tournamentDeck.meleeDecklistGuid,
              t.id,
              d.tournamentDeck.meleePlayerUsername,
            );
        } else {
          //if hes not there, find the player by decklist guid
          const playerInfoByMeleeDecklistGuid = Object.values(playerInfo).find(
            pi => pi.meleeDeckId === d.tournamentDeck.meleeDecklistGuid,
          );

          if (playerInfoByMeleeDecklistGuid) {
            playerInfo[d.tournamentDeck.meleePlayerUsername] = {
              deckId: playerInfoByMeleeDecklistGuid.deckId,
              meleeDeckId: d.tournamentDeck.meleeDecklistGuid ?? '',
              matches: await fetchDeckMatchesWithMeleeDeckIds(
                d.tournamentDeck.meleeDecklistGuid,
                t.id,
                d.tournamentDeck.meleePlayerUsername,
              ),
            };
          }
        }
      }
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

      if (playerInfo[match.p1Username]) {
        const newMatch: TournamentMatchInsert = {
          ...match,
          p1DeckId: playerInfo[match.p1Username].deckId,
          p2DeckId: match.p2Username ? playerInfo[match.p2Username]?.deckId : null,
          p2Points: match.p2Username
            ? playerInfo[match.p2Username]?.matches?.find(m => m.round === match.round)?.p1Points
            : null,
        };

        if (minRound && newMatch.round < minRound) return;
        if (maxRound && newMatch.round > maxRound) return;
        matchesWithSwubaseDeckIds.push(newMatch);
      } else {
        console.error('playerInfo[match.p1Username] - ', match.p1Username, ' - doesnt exist!');
      }
    });
  });

  console.log('Inserting matches with Swubase deck IDs...');

  // Delete tournament matches, conditionally filtering by round if minRound or maxRound are provided
  if (minRound !== undefined || maxRound !== undefined) {
    let conditions = [eq(tournamentMatch.tournamentId, t.id)];

    if (minRound !== undefined) {
      conditions.push(gte(tournamentMatch.round, minRound));
    }

    if (maxRound !== undefined) {
      conditions.push(lte(tournamentMatch.round, maxRound));
    }

    console.log(
      `Deleting matches for tournament ${t.id} with round constraints: minRound=${minRound}, maxRound=${maxRound}`,
    );
    await db.delete(tournamentMatch).where(and(...conditions));
  } else {
    console.log(`Deleting all matches for tournament ${t.id}`);
    await db.delete(tournamentMatch).where(eq(tournamentMatch.tournamentId, t.id));
  }

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
