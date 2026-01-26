import {
  pgTable,
  text,
  smallint,
  timestamp,
  uuid,
  index,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import type { InferSelectModel } from 'drizzle-orm';

export const integration = pgTable('integration', {
  id: smallint('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const userIntegration = pgTable(
  'user_integration',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    integrationId: smallint('integration_id')
      .notNull()
      .references(() => integration.id, { onDelete: 'restrict' }),

    externalUserId: text('external_user_id').notNull(),

    linkTokenEnc: text('link_token_enc'),
    refreshTokenEnc: text('refresh_token_enc'),
    accessTokenEnc: text('access_token_enc'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),

    linkedAt: timestamp('linked_at'),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),

    scopes: text('scopes').array().notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => {
    return {
      userIdIntegrationIdUnique: unique().on(table.userId, table.integrationId),
      integrationIdExternalUserIdUnique: unique().on(table.integrationId, table.externalUserId),
      idxUserIntegrationUser: index('idx_user_integration_user').on(table.userId),
      idxUserAccessToken: index('idx_access_token').on(table.accessTokenEnc),
      idxUserRefreshToken: index('idx_refresh_token').on(table.refreshTokenEnc),
      idxUserIntegrationIntegration: index('idx_user_integration_integration').on(
        table.integrationId,
      ),
    };
  },
);

export const integrationGameData = pgTable(
  'integration_game_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integrationId: smallint('integration_id')
      .notNull()
      .references(() => integration.id, { onDelete: 'restrict' }),
    gameId: text('game_id').notNull(),
    lobbyId: text('lobby_id').notNull(),
    userId1: text('user_id_1').references(() => user.id, { onDelete: 'set null' }),
    userId2: text('user_id_2').references(() => user.id, { onDelete: 'set null' }),
    data: jsonb('data').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => {
    return {
      idxIntegrationGameDataGameId: index('idx_integration_game_data_game_id').on(table.gameId),
      idxIntegrationGameDataLobbyId: index('idx_integration_game_data_lobby_id').on(table.lobbyId),
    };
  },
);

export const integrationSchema = {
  integration,
  userIntegration,
  integrationGameData,
};

export type UserIntegration = InferSelectModel<typeof userIntegration>;
export type IntegrationGameData = InferSelectModel<typeof integrationGameData>;
