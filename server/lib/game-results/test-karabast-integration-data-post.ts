import path from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import {
  integration,
  integrationGameData,
  karabastLobbyMatch,
  userIntegration,
} from '../../db/schema/integration.ts';
import { gameResult } from '../../db/schema/game_result.ts';
import { decrypt } from '../utils/tokenUtils.ts';

type KarabastExamplePayload = {
  gameId: string;
  lobbyId: string;
  players?: Array<{
    data?: {
      id?: string;
      accessToken?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

const DEFAULT_ENDPOINT_URL = `http://localhost:5173/api/integration/karabast/game-result`;
const DEFAULT_PAYLOAD_PATH = path.join(
  process.cwd(),
  'server',
  'routes',
  'integration',
  'karabast',
  'game-result',
  'karabast-payload.example.json',
);

const parseJsonSafe = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const main = async () => {
  const endpointUrl = process.argv[2] || DEFAULT_ENDPOINT_URL;
  const testUserId = process.env.TEST_USER_ID;
  const clientId = process.env.KARABAST_CLIENT_ID;
  const clientSecret = process.env.KARABAST_CLIENT_SECRET;

  if (!testUserId) {
    throw new Error('Missing TEST_USER_ID in environment.');
  }

  if (!clientId || !clientSecret) {
    throw new Error('Missing KARABAST_CLIENT_ID or KARABAST_CLIENT_SECRET in environment.');
  }

  const payloadFile = Bun.file(DEFAULT_PAYLOAD_PATH);
  if (!(await payloadFile.exists())) {
    throw new Error(`Payload file not found at ${DEFAULT_PAYLOAD_PATH}`);
  }

  const payloadData = (await payloadFile.json()) as KarabastExamplePayload;
  if (!payloadData.players || payloadData.players.length === 0) {
    throw new Error('Example payload does not contain any players.');
  }

  const [integrationRecord] = await db
    .select({ id: integration.id })
    .from(integration)
    .where(eq(integration.name, 'karabast'))
    .limit(1);

  if (!integrationRecord) {
    throw new Error('Karabast integration record not found.');
  }

  const [userIntegrationRecord] = await db
    .select({
      externalUserId: userIntegration.externalUserId,
      accessTokenEnc: userIntegration.accessTokenEnc,
    })
    .from(userIntegration)
    .where(
      and(
        eq(userIntegration.integrationId, integrationRecord.id),
        eq(userIntegration.userId, testUserId),
      ),
    )
    .limit(1);

  if (!userIntegrationRecord) {
    throw new Error(`No Karabast user_integration found for TEST_USER_ID=${testUserId}.`);
  }

  if (!userIntegrationRecord.accessTokenEnc) {
    throw new Error(
      `Karabast user_integration for TEST_USER_ID=${testUserId} has no accessTokenEnc.`,
    );
  }

  const decryptedAccessToken = decrypt(userIntegrationRecord.accessTokenEnc);
  const playerIndex = payloadData.players.findIndex(
    player => player.data?.id === userIntegrationRecord.externalUserId,
  );

  if (playerIndex === -1) {
    const payloadPlayerIds = payloadData.players.map(player => player.data?.id ?? null);
    throw new Error(
      `Could not find payload player with externalUserId=${userIntegrationRecord.externalUserId}. Payload player IDs: ${JSON.stringify(payloadPlayerIds)}`,
    );
  }

  payloadData.players.forEach(player => {
    if (player.data) {
      player.data.accessToken = null;
    }
  });
  payloadData.players[playerIndex]!.data!.accessToken = decryptedAccessToken;
  const chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  payloadData.gameId = `${[1, 1, 1, 1, 1, 1, 1, 1].map(c => chars[Math.floor(Math.random() * 16)]).join('')}-32b5-4714-aaa6-978c7cf6a1a8`;

  const requestBody = {
    integration: 'karabast' as const,
    client_id: clientId,
    client_secret: clientSecret,
    data: payloadData,
  };

  const redactedPayload = {
    ...requestBody,
    client_secret: '[REDACTED]',
    data: {
      ...requestBody.data,
      players: requestBody.data.players?.map((player, index) => ({
        ...player,
        data: player.data
          ? {
              ...player.data,
              accessToken:
                index === playerIndex && player.data.accessToken
                  ? '[REDACTED]'
                  : player.data.accessToken,
            }
          : player.data,
      })),
    },
  };

  console.log('Posting Karabast payload...');
  console.log(
    JSON.stringify(
      {
        endpointUrl,
        testUserId,
        matchedExternalUserId: userIntegrationRecord.externalUserId,
        matchedPlayerIndex: playerIndex,
        gameId: payloadData.gameId,
        lobbyId: payloadData.lobbyId,
      },
      null,
      2,
    ),
  );
  console.log('Redacted request body preview:');
  console.log(JSON.stringify(redactedPayload, null, 2));

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  const responseBody = parseJsonSafe(responseText);

  console.log('Response:');
  console.log(
    JSON.stringify(
      {
        ok: response.ok,
        status: response.status,
        body: responseBody,
      },
      null,
      2,
    ),
  );

  const rawRows = await db
    .select({
      id: integrationGameData.id,
      createdAt: integrationGameData.createdAt,
      gameId: integrationGameData.gameId,
      lobbyId: integrationGameData.lobbyId,
      userId1: integrationGameData.userId1,
      userId2: integrationGameData.userId2,
    })
    .from(integrationGameData)
    .where(eq(integrationGameData.gameId, payloadData.gameId))
    .orderBy(desc(integrationGameData.createdAt))
    .limit(3);

  const mappingRows = await db
    .select({
      matchId: karabastLobbyMatch.matchId,
      userId: karabastLobbyMatch.userId,
      lobbyId: karabastLobbyMatch.lobbyId,
      deckId: karabastLobbyMatch.deckId,
      opponentLeaderCardId: karabastLobbyMatch.opponentLeaderCardId,
      opponentBaseCardKey: karabastLobbyMatch.opponentBaseCardKey,
      createdAt: karabastLobbyMatch.createdAt,
    })
    .from(karabastLobbyMatch)
    .where(eq(karabastLobbyMatch.lobbyId, payloadData.lobbyId))
    .orderBy(desc(karabastLobbyMatch.createdAt));

  const gameResultRows = await db
    .select({
      id: gameResult.id,
      userId: gameResult.userId,
      deckId: gameResult.deckId,
      matchId: gameResult.matchId,
      gameId: gameResult.gameId,
      gameNumber: gameResult.gameNumber,
      opponentLeaderCardId: gameResult.opponentLeaderCardId,
      opponentBaseCardKey: gameResult.opponentBaseCardKey,
      createdAt: gameResult.createdAt,
      updatedAt: gameResult.updatedAt,
    })
    .from(gameResult)
    .where(eq(gameResult.gameId, payloadData.gameId))
    .orderBy(desc(gameResult.updatedAt));

  console.log('Latest matching integration_game_data rows:');
  console.log(JSON.stringify(rawRows, null, 2));

  console.log('karabast_lobby_match rows for this lobby:');
  console.log(JSON.stringify(mappingRows, null, 2));

  console.log('game_result rows for this gameId:');
  console.log(JSON.stringify(gameResultRows, null, 2));
};

if (import.meta.main) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('test-karabast-integration-data-post failed');
      console.error(error);
      process.exit(1);
    });
}
