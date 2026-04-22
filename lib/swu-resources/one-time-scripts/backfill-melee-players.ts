/**
 * One-time script to backfill the live-tournament `player` table from Melee.
 *
 * It walks every tournament with a Melee ID, fetches the tournament view, takes
 * the final round standings, and upserts all players found there.
 *
 * Usage:
 *   bun run lib/swu-resources/one-time-scripts/backfill-melee-players.ts
 */

import { and, isNotNull, ne } from 'drizzle-orm';
import { db } from '../../../server/db';
import { tournament as tournamentTable } from '../../../server/db/schema/tournament.ts';
import {
  fetchRoundStandings,
  fetchTournamentView,
} from '../../../server/lib/imports/tournamentImportLib.ts';
import {
  upsertPlayers,
  type UpsertPlayerInput,
} from '../../../server/lib/live-tournaments/upsertPlayers.ts';
import { delay } from '../lib/delay.ts';

type TournamentRow = {
  id: string;
  name: string;
  meleeId: string | null;
};

const numberOrNull = (value: unknown) => {
  const parsedValue =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? '').trim(), 10);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const stringOrNull = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

function parseStandingPlayer(standing: any): UpsertPlayerInput | null {
  const meleePlayer = standing?.Team?.Players?.[0];
  const id = numberOrNull(meleePlayer?.ID);

  if (id === null) {
    return null;
  }

  return {
    id,
    displayName:
      stringOrNull(meleePlayer?.DisplayName) ??
      stringOrNull(meleePlayer?.Username) ??
      `Melee Player ${id}`,
  };
}

async function getTournamentsWithMeleeId(): Promise<TournamentRow[]> {
  return db
    .select({
      id: tournamentTable.id,
      name: tournamentTable.name,
      meleeId: tournamentTable.meleeId,
    })
    .from(tournamentTable)
    .where(and(isNotNull(tournamentTable.meleeId), ne(tournamentTable.meleeId, '')));
}

async function main() {
  console.log('[backfill-melee-players] Loading tournaments with Melee IDs...');

  const tournaments = await getTournamentsWithMeleeId();

  if (tournaments.length === 0) {
    console.log('[backfill-melee-players] No tournaments with Melee IDs found.');
    process.exit(0);
  }

  console.log(`[backfill-melee-players] Found ${tournaments.length} tournaments to inspect.`);

  const failures: { tournamentId: string; name: string; meleeId: string; error: string }[] = [];

  let tournamentsWithFinalRound = 0;
  let tournamentsWithoutFinalRound = 0;
  let standingsRowsFetched = 0;

  for (const [index, tournament] of tournaments.entries()) {
    const playersById = new Map<number, UpsertPlayerInput>();
    const meleeId = tournament.meleeId;
    if (!meleeId) {
      tournamentsWithoutFinalRound++;
      continue;
    }

    console.log(
      `[backfill-melee-players] (${index + 1}/${tournaments.length}) Fetching ${tournament.name} [${meleeId}]`,
    );

    try {
      const tournamentView = await fetchTournamentView(meleeId);
      await delay(500);
      const finalRoundId = tournamentView?.finalRoundId;

      if (!finalRoundId) {
        tournamentsWithoutFinalRound++;
        console.log(
          `[backfill-melee-players] Skipping ${tournament.name}: no final round found in Melee view.`,
        );
        continue;
      }

      const standings = await fetchRoundStandings(finalRoundId);
      const beforeCount = playersById.size;

      standingsRowsFetched += standings.length;
      tournamentsWithFinalRound++;

      for (const standing of standings) {
        const player = parseStandingPlayer(standing);
        if (!player) {
          continue;
        }
        playersById.set(player.id, player);
      }

      const addedCount = playersById.size - beforeCount;
      console.log(
        `[backfill-melee-players] Collected ${standings.length} standings rows, ${addedCount} new unique players.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      failures.push({
        tournamentId: tournament.id,
        name: tournament.name,
        meleeId,
        error: message,
      });

      console.error(
        `[backfill-melee-players] Failed for ${tournament.name} [${meleeId}]: ${message}`,
      );
    }
    console.log(`[backfill-melee-players] Upserting ${playersById.size} players...`);
    await upsertPlayers([...playersById.values()]);
  }

  console.log('[backfill-melee-players] Summary:', {
    tournamentCount: tournaments.length,
    tournamentsWithFinalRound,
    tournamentsWithoutFinalRound,
    standingsRowsFetched,
    failedTournamentCount: failures.length,
  });

  if (failures.length > 0) {
    console.error('[backfill-melee-players] Failed tournaments:', failures);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('[backfill-melee-players] Unhandled error:', error);
  process.exit(1);
});
