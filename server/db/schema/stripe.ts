import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import type { SupportCurrency } from '../../../shared/types/support.ts';

// Provider records survive account deletion as unowned receipts. Never match
// them to a new account by email or grant a previously paid receipt again.
export const stripeCustomer = pgTable(
  'stripe_customer',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: text('account_id').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    stripeId: text('stripe_id').unique(),
    reviewRequired: boolean('review_required').notNull().default(false),
    reviewKeys: text('review_keys')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('stripe_customer_account_user_idx').on(table.accountId, table.userId)],
);

export const stripeCheckout = pgTable(
  'stripe_checkout',
  {
    id: uuid('id').primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => stripeCustomer.id),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    kind: text('kind').$type<'monthly' | 'one_time'>().notNull(),
    currency: text('currency').$type<SupportCurrency>().notNull(),
    amount: integer('amount'),
    priceId: text('price_id').notNull(),
    state: text('state')
      .$type<'creating' | 'open' | 'complete' | 'expired'>()
      .notNull()
      .default('creating'),
    stripeId: text('stripe_id').unique(),
    subscriptionId: text('subscription_id').unique(),
    reviewInvoiceId: text('review_invoice_id'),
    url: text('url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('stripe_checkout_customer_idx').on(table.customerId),
    uniqueIndex('stripe_checkout_pending_monthly_idx')
      .on(table.customerId)
      .where(sql`${table.kind} = 'monthly' AND ${table.state} IN ('creating', 'open')`),
    check('stripe_checkout_kind_check', sql`${table.kind} IN ('monthly', 'one_time')`),
    check('stripe_checkout_currency_check', sql`${table.currency} IN ('EUR', 'USD')`),
    check(
      'stripe_checkout_state_check',
      sql`${table.state} IN ('creating', 'open', 'complete', 'expired')`,
    ),
    check(
      'stripe_checkout_amount_check',
      sql`(${table.kind} = 'one_time' AND ${table.amount} IS NULL) OR (${table.kind} = 'monthly' AND ${table.amount} IS NOT NULL AND ${table.amount} IN (5, 10, 20))`,
    ),
  ],
);

export const stripePayment = pgTable(
  'stripe_payment',
  {
    id: text('id').primaryKey(), // PaymentIntent identity, shared by all delivery types.
    customerId: uuid('customer_id')
      .notNull()
      .references(() => stripeCustomer.id),
    checkoutId: uuid('checkout_id')
      .notNull()
      .references(() => stripeCheckout.id),
    invoiceId: text('invoice_id'),
    currency: text('currency').$type<SupportCurrency>().notNull(),
    amountCents: integer('amount_cents').notNull(),
    usdCents: integer('usd_cents'),
    usdPerEur: text('usd_per_eur'),
    rateDate: text('rate_date'),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    creditedAt: timestamp('credited_at', { withTimezone: true }),
    reviewRequired: boolean('review_required').notNull().default(false),
  },
  table => [
    index('stripe_payment_customer_paid_idx').on(table.customerId, table.paidAt),
    check('stripe_payment_currency_check', sql`${table.currency} IN ('EUR', 'USD')`),
    check(
      'stripe_payment_amount_check',
      sql`${table.amountCents} > 0 AND (${table.usdCents} IS NULL OR ${table.usdCents} > 0)`,
    ),
  ],
);
