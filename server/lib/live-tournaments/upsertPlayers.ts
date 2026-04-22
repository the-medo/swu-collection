import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { player as playerTable } from '../../db/schema/tournament_weekend.ts';

export type UpsertPlayerInput = {
  id: number;
  displayName: string;
};

const PLAYER_UPSERT_BATCH_SIZE = 500;

function dedupePlayers(players: UpsertPlayerInput[]) {
  const playersById = new Map<number, UpsertPlayerInput>();

  for (const player of players) {
    playersById.set(player.id, player);
  }

  return [...playersById.values()];
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
        target: playerTable.id,
        set: {
          displayName: sql`excluded.display_name`,
          updatedAt: sql`NOW()`,
        },
      });
  }

  return uniquePlayers.length;
}
