import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { player as playerTable } from '../../db/schema/tournament_weekend.ts';

export type UpsertPlayerInput = {
  displayName: string;
};

const PLAYER_UPSERT_BATCH_SIZE = 500;

function dedupePlayers(players: UpsertPlayerInput[]) {
  const playersByDisplayName = new Map<string, UpsertPlayerInput>();

  for (const player of players) {
    playersByDisplayName.set(player.displayName, player);
  }

  return [...playersByDisplayName.values()];
}

export async function upsertPlayers(players: UpsertPlayerInput[]) {
  const uniquePlayers = dedupePlayers(players);

  for (let index = 0; index < uniquePlayers.length; index += PLAYER_UPSERT_BATCH_SIZE) {
    const batch = uniquePlayers.slice(index, index + PLAYER_UPSERT_BATCH_SIZE);

    if (batch.length === 0) {
      continue;
    }

    await db
      .insert(playerTable)
      .values(batch)
      .onConflictDoUpdate({
        target: playerTable.displayName,
        set: {
          updatedAt: sql`NOW()`,
        },
      });
  }

  return uniquePlayers.length;
}
