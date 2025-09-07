import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckInformation as deckInformationTable } from '../../../../db/schema/deck_information.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { tournamentDeck as tournamentDeckTable } from '../../../../db/schema/tournament_deck.ts';
import { tournamentMatch as tournamentMatchTable } from '../../../../db/schema/tournament_match.ts';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { batchArray } from '../../../../lib/utils/batch.ts';
import {
  computeAndSaveTournamentStatistics,
  computeAndSaveMetaStatistics,
} from '../../../../lib/card-statistics';
import { updateTournamentGroupsStatisticsForTournament } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';

const bucketName = 'swu-images';
const r2Endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

async function getJson<T>(key: string): Promise<T> {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const response = await s3Client.send(command);
  const text = await response.Body?.transformToString();
  if (!text) throw new Error(`No content at ${key}`);
  return JSON.parse(text) as T;
}

const zImportFromBlobBody = z.object({
  sourceTournamentId: z.string().uuid(),
  markAsImported: z.boolean().optional().default(true),
});

export const tournamentIdImportFromBlobPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const paramTournamentId = z.string().uuid().parse(c.req.param('id'));
  const { sourceTournamentId, markAsImported } = zImportFromBlobBody.parse(await c.req.json());
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: { tournament: ['import'] },
    },
  });
  if (!hasPermission.success) {
    return c.json({ message: "You don't have permission to import to this tournament." }, 403);
  }

  const tournament = (
    await db.select().from(tournamentTable).where(eq(tournamentTable.id, paramTournamentId))
  )[0];
  if (!tournament) {
    return c.json(
      { message: "Tournament doesn't exist or you don't have permission to access it" },
      404,
    );
  }

  const basePath = `data/tournaments/${sourceTournamentId}`;

  // Load JSON files from Blob
  type AnyRow = Record<string, any>;
  const decks = await getJson<AnyRow[]>(`${basePath}/deck.json`).catch(() => []);
  const deckInfos = await getJson<AnyRow[]>(`${basePath}/deck_information.json`).catch(() => []);
  const deckCards = await getJson<AnyRow[]>(`${basePath}/deck_card.json`).catch(() => []);
  const tournamentDecksSource = await getJson<AnyRow[]>(`${basePath}/tournament_deck.json`).catch(
    () => [],
  );
  const matchesSource = await getJson<AnyRow[]>(`${basePath}/tournament_match.json`).catch(
    () => [],
  );

  // Remap tournamentId to the target tournament for tournament_deck and tournament_match
  const tournamentDecks = tournamentDecksSource.map(row => ({
    ...row,
    tournamentId: paramTournamentId,
  }));
  const matches = matchesSource.map(row => ({ ...row, tournamentId: paramTournamentId }));

  const BATCH_SIZE = 1000;

  // Insert in required order inside a transaction, using batching
  await db.transaction(async tx => {
    if (decks.length) {
      for (const batch of batchArray(decks, BATCH_SIZE)) {
        await tx
          .insert(deckTable)
          .values(batch as any)
          .onConflictDoNothing();
      }
    }
    if (deckInfos.length) {
      for (const batch of batchArray(deckInfos, BATCH_SIZE)) {
        await tx
          .insert(deckInformationTable)
          .values(batch as any)
          .onConflictDoNothing();
      }
    }
    if (deckCards.length) {
      for (const batch of batchArray(deckCards, BATCH_SIZE)) {
        await tx
          .insert(deckCardTable)
          .values(batch as any)
          .onConflictDoNothing();
      }
    }
    if (tournamentDecks.length) {
      for (const batch of batchArray(tournamentDecks, BATCH_SIZE)) {
        await tx
          .insert(tournamentDeckTable)
          .values(batch as any)
          .onConflictDoNothing();
      }
    }
    if (matches.length) {
      for (const batch of batchArray(matches, BATCH_SIZE)) {
        await tx
          .insert(tournamentMatchTable)
          .values(batch as any)
          .onConflictDoNothing();
      }
    }
  });

  // Mark as imported and compute statistics (similar to import-melee)
  if (markAsImported) {
    await db
      .update(tournamentTable)
      .set({ imported: true, updatedAt: sql`NOW()` })
      .where(eq(tournamentTable.id, paramTournamentId));

    // Compute tournament card statistics
    await computeAndSaveTournamentStatistics(paramTournamentId);

    // If tournament has a meta, compute meta card statistics
    if (tournament.meta) {
      await computeAndSaveMetaStatistics(tournament.meta);
    }

    // Update tournament group statistics for all groups that contain this tournament
    try {
      await updateTournamentGroupsStatisticsForTournament(paramTournamentId);
    } catch (error) {
      console.error('Error updating tournament group statistics:', error);
    }
  }

  return c.json({
    success: true,
    message: 'Imported tournament data from blob',
    sourcePath: basePath,
    targetTournamentId: paramTournamentId,
    sourceTournamentId,
  });
});
