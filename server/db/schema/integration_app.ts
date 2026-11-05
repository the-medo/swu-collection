import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import type { IntegrationAppScope } from '../../../shared/types/integrationApp.ts';

export const integrationApp = pgTable(
  'integration_app',
  {
    clientId: text('client_id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    secretHash: text('secret_hash').notNull(),
    redirectUris: text('redirect_uris').array().notNull(),
    scopes: text('scopes').array().$type<IntegrationAppScope[]>().notNull(),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [index('integration_app_owner_idx').on(table.ownerId)],
);

export const integrationAppCode = pgTable(
  'integration_app_code',
  {
    codeHash: text('code_hash').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => integrationApp.clientId, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes').array().$type<IntegrationAppScope[]>().notNull(),
    redirectUri: text('redirect_uri').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  table => [
    unique('integration_app_code_client_user_unique').on(table.clientId, table.userId),
    index('integration_app_code_user_idx').on(table.userId),
    index('integration_app_code_expiry_idx').on(table.expiresAt),
  ],
);

export const integrationAppConnection = pgTable(
  'integration_app_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: text('client_id')
      .notNull()
      .references(() => integrationApp.clientId, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes').array().$type<IntegrationAppScope[]>().notNull(),
    accessTokenHash: text('access_token_hash').notNull().unique(),
    refreshTokenHash: text('refresh_token_hash').notNull().unique(),
    accessExpiresAt: timestamp('access_expires_at').notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at').notNull(),
    connectedAt: timestamp('connected_at').notNull().defaultNow(),
  },
  table => [
    unique('integration_app_connection_client_user_unique').on(table.clientId, table.userId),
    index('integration_app_connection_user_idx').on(table.userId),
  ],
);

export const integrationAppRefreshUse = pgTable(
  'integration_app_refresh_use',
  {
    tokenHash: text('token_hash').primaryKey(),
    connectionId: uuid('connection_id').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  table => [
    foreignKey({
      name: 'integration_refresh_use_connection_fk',
      columns: [table.connectionId],
      foreignColumns: [integrationAppConnection.id],
    }).onDelete('cascade'),
    index('integration_refresh_use_connection_idx').on(table.connectionId, table.expiresAt),
  ],
);
