import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { tournamentDeck as tournamentDeckTable } from '../../../../db/schema/tournament_deck.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { deckInformation as deckInformationTable } from '../../../../db/schema/deck_information.ts';
import { tournamentMatch as tournamentMatchTable } from '../../../../db/schema/tournament_match.ts';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

async function putJson(key: string, data: unknown) {
  const body = JSON.stringify(data);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  });
  await s3Client.send(command);
}

export const tournamentIdExportToBlobPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const paramTournamentId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: { tournament: ['import'] },
    },
  });
  if (!hasPermission.success) {
    return c.json({ message: "You don't have permission to export this tournament." }, 403);
  }

  // Verify ownership
  const tournament = (
    await db.select().from(tournamentTable).where(eq(tournamentTable.id, paramTournamentId))
  )[0];
  if (!tournament) {
    return c.json(
      { message: "Tournament doesn't exist or you don't have permission to access it" },
      404,
    );
  }

  // Load tournament_deck rows
  const tournamentDecks = await db
    .select()
    .from(tournamentDeckTable)
    .where(eq(tournamentDeckTable.tournamentId, paramTournamentId));

  const deckIds = Array.from(new Set(tournamentDecks.map(td => td.deckId)));

  // Fetch dependent data
  const decks = deckIds.length
    ? await db.select().from(deckTable).where(inArray(deckTable.id, deckIds))
    : [];
  const deckCards = deckIds.length
    ? await db.select().from(deckCardTable).where(inArray(deckCardTable.deckId, deckIds))
    : [];
  const deckInfos = deckIds.length
    ? await db
        .select()
        .from(deckInformationTable)
        .where(inArray(deckInformationTable.deckId, deckIds))
    : [];
  const matches = await db
    .select()
    .from(tournamentMatchTable)
    .where(eq(tournamentMatchTable.tournamentId, paramTournamentId));

  // Save to R2 under /data/tournaments/_id
  const basePath = `data/tournaments/${paramTournamentId}`; // without leading slash for S3 key
  await putJson(`${basePath}/deck.json`, decks);
  await putJson(`${basePath}/deck_information.json`, deckInfos);
  await putJson(`${basePath}/deck_card.json`, deckCards);
  await putJson(`${basePath}/tournament_deck.json`, tournamentDecks);
  await putJson(`${basePath}/tournament_match.json`, matches);

  return c.json({ success: true, message: 'Exported tournament data to blob', path: basePath });
});
