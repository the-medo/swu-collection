import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import type { CreditCurrency, ShopItemId } from '../../../shared/types/credits.ts';

export const patreonConnection = pgTable('patreon_connection', {
  clientId: text('client_id').primaryKey(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  campaignId: text('campaign_id'),
  currency: text('currency'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncSkipped: integer('last_sync_skipped').notNull().default(0),
  lastWebhookAt: timestamp('last_webhook_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const patreonMember = pgTable(
  'patreon_member',
  {
    campaignId: text('campaign_id').notNull(),
    memberId: text('member_id').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    email: text('email'),
    name: text('name'),
    patronStatus: text('patron_status'),
    lastChargeAt: timestamp('last_charge_at', { withTimezone: true }),
    lastChargeStatus: text('last_charge_status'),
    lifetimeCents: bigint('lifetime_cents', { mode: 'number' }),
    creditedCents: bigint('credited_cents', { mode: 'number' }).notNull().default(0),
    reviewReason: text('review_reason'),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  table => [
    primaryKey({ columns: [table.campaignId, table.memberId] }),
    index('patreon_member_email_idx').on(table.email),
    index('patreon_member_user_idx').on(table.userId),
    check(
      'patreon_member_credited_cents_check',
      sql`${table.creditedCents} >= 0 AND ${table.creditedCents} <= 900719925474099`,
    ),
    check(
      'patreon_member_lifetime_cents_check',
      sql`${table.lifetimeCents} >= 0 AND ${table.lifetimeCents} <= 900719925474099`,
    ),
  ],
);

// Shared transaction ledger. A database trigger maintains user_profile balances.
// Credits are whole units; beskar amounts are hundredths. Shop debits are negative.
export const userCredits = pgTable(
  'user_credits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    currency: text('currency').$type<CreditCurrency>().notNull().default('credits'),
    itemId: text('item_id').$type<ShopItemId>(),
    source: text('source').notNull(),
    sourceKey: text('source_key').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    check('user_credits_currency_check', sql`${table.currency} IN ('credits', 'beskar')`),
    check(
      'user_credits_item_check',
      sql`${table.itemId} IS NULL OR ${table.itemId} IN ('achievement-slot', 'battlefield-slot')`,
    ),
    index('user_credits_user_created_idx').on(table.userId, table.createdAt),
    check(
      'user_credits_amount_check',
      sql`${table.amount} != 0 AND ${table.amount} BETWEEN -9007199254740991 AND 9007199254740991`,
    ),
  ],
);
