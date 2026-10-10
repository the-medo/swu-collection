import { expect, test } from 'bun:test';
import Stripe from 'stripe';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import { stripeCheckout, stripeCustomer, stripePayment } from '../../db/schema/stripe.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createStripeAccounting } from './accounting.ts';
import { createSupportService, priceLookupKey } from './service.ts';
import { createSupportRoute } from '../../routes/support.ts';
import { createStripeWebhookRoute } from '../../routes/integration/stripe/webhook.ts';
import type { SupportCheckoutInput } from '../../../shared/types/support.ts';

const enabled = process.env.SWUBASE_STRIPE_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Stripe tests require an isolated worktree database.');
}
const config = () => ({
  accountId: 'acct_support_fixture',
  key: 'sk_test_fixture',
  live: false,
  origin: 'https://swubase.invalid',
});
async function fixture() {
  const userId = `stripe-test-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id: userId,
    name: userId,
    displayName: userId,
    currency: 'USD',
    email: `${userId}@invalid.local`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [customer] = await db
    .insert(stripeCustomer)
    .values({ userId, accountId: config().accountId, stripeId: `cus_${crypto.randomUUID()}` })
    .returning();
  const [checkout] = await db
    .insert(stripeCheckout)
    .values({
      id: crypto.randomUUID(),
      userId,
      customerId: customer.id,
      kind: 'one_time',
      currency: 'EUR',
      priceId: 'price_eur_custom',
      state: 'complete',
    })
    .returning();
  return {
    userId,
    customer,
    checkout,
    async cleanup() {
      await db.delete(stripePayment).where(eq(stripePayment.customerId, customer.id));
      await db.delete(stripeCheckout).where(eq(stripeCheckout.customerId, customer.id));
      await db.delete(stripeCustomer).where(eq(stripeCustomer.id, customer.id));
      await db.delete(user).where(eq(user.id, userId));
    },
  };
}
const rates = { at: async () => ({ date: '2026-10-08', usdPerEur: '1.1186' }) };

test.skipIf(!enabled)(
  'concurrent payment replays grant both currencies exactly once and preserve the FX snapshot',
  async () => {
    const f = await fixture();
    try {
      const accounting = createStripeAccounting(db, rates);
      const payment = {
        paymentId: `pi_${crypto.randomUUID()}`,
        customerId: f.customer.id,
        checkoutId: f.checkout.id,
        invoiceId: null,
        currency: 'EUR' as const,
        amountCents: 500,
        paidAt: new Date('2026-10-09T10:00:00Z'),
        reviewRequired: false,
      };
      const receipts = await Promise.all(
        Array.from({ length: 8 }, () => accounting.apply(payment)),
      );
      expect(
        receipts.every(r => r.status === 'paid' && r.credits === 5590 && r.beskarCents === 559),
      ).toBe(true);
      const entries = await db
        .select()
        .from(userCredits)
        .where(and(eq(userCredits.userId, f.userId), eq(userCredits.source, 'stripe')));
      expect(entries).toHaveLength(2);
      const unavailableRates = {
        at: async () => {
          throw new Error('ECB is down');
        },
      };
      expect((await createStripeAccounting(db, unavailableRates).apply(payment)).credits).toBe(
        5590,
      );
      await expect(accounting.apply({ ...payment, amountCents: 501 })).rejects.toThrow();
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(2);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'a ledger conflict rolls back the receipt and both grants together',
  async () => {
    const f = await fixture();
    try {
      const paymentId = `pi_${crypto.randomUUID()}`;
      await db.insert(userCredits).values({
        userId: f.userId,
        currency: 'beskar',
        amount: 1,
        source: 'fixture',
        sourceKey: `stripe:beskar:${paymentId}`,
      });
      await expect(
        createStripeAccounting(db, rates).apply({
          paymentId,
          customerId: f.customer.id,
          checkoutId: f.checkout.id,
          invoiceId: null,
          currency: 'USD',
          amountCents: 500,
          paidAt: new Date(),
          reviewRequired: false,
        }),
      ).rejects.toThrow();
      expect(
        await db.select().from(stripePayment).where(eq(stripePayment.id, paymentId)),
      ).toHaveLength(0);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'refunds arriving before payment create sticky holds; deleted accounts cannot reassign rewards',
  async () => {
    const f = await fixture();
    try {
      const accounting = createStripeAccounting(db, rates);
      await accounting.hold(f.customer.stripeId!, f.customer.accountId, null);
      const payment = {
        paymentId: `pi_${crypto.randomUUID()}`,
        customerId: f.customer.id,
        checkoutId: f.checkout.id,
        invoiceId: null,
        currency: 'USD' as const,
        amountCents: 500,
        paidAt: new Date(),
        reviewRequired: false,
      };
      expect((await accounting.apply(payment)).status).toBe('review');
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(0);
      await db.delete(user).where(eq(user.id, f.userId));
      await db
        .update(stripeCustomer)
        .set({ reviewRequired: false })
        .where(eq(stripeCustomer.id, f.customer.id));
      expect(
        (await accounting.apply({ ...payment, paymentId: `pi_${crypto.randomUUID()}` })).status,
      ).toBe('review');
      expect(
        (await db.select().from(stripeCheckout).where(eq(stripeCheckout.id, f.checkout.id)))[0]
          .userId,
      ).toBeNull();
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'contributor sanitization clears every Stripe identity and receipt',
  async () => {
    const f = await fixture();
    try {
      await createStripeAccounting(db, rates).apply({
        paymentId: `pi_${crypto.randomUUID()}`,
        customerId: f.customer.id,
        checkoutId: f.checkout.id,
        invoiceId: null,
        currency: 'USD',
        amountCents: 500,
        paidAt: new Date(),
        reviewRequired: false,
      });
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const block = sanitizer.match(/DO \$stripe_support\$[\s\S]*?\$stripe_support\$;/)?.[0];
      expect(block).toBeDefined();
      await db
        .transaction(async tx => {
          await tx.execute(sql.raw(block!));
          expect(await tx.select().from(stripePayment)).toHaveLength(0);
          expect(await tx.select().from(stripeCheckout)).toHaveLength(0);
          expect(await tx.select().from(stripeCustomer)).toHaveLength(0);
          throw new Error('rollback privacy fixture');
        })
        .catch(error => {
          if (error.message !== 'rollback privacy fixture') throw error;
        });
      expect(
        await db.select().from(stripePayment).where(eq(stripePayment.customerId, f.customer.id)),
      ).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'a fraud warning before receipt creation stays on that payment after the customer hold is cleared',
  async () => {
    const f = await fixture();
    try {
      const accounting = createStripeAccounting(db, rates);
      const paymentId = `pi_${crypto.randomUUID()}`;
      await accounting.hold(
        f.customer.stripeId!,
        f.customer.accountId,
        paymentId,
        'fraud_warning:fixture',
      );
      await db
        .update(stripeCustomer)
        .set({ reviewRequired: false })
        .where(eq(stripeCustomer.id, f.customer.id));
      const payment = {
        paymentId,
        customerId: f.customer.id,
        checkoutId: f.checkout.id,
        invoiceId: null,
        currency: 'USD' as const,
        amountCents: 500,
        paidAt: new Date(),
        reviewRequired: false,
      };
      expect((await accounting.apply(payment)).status).toBe('review');
      expect(
        (await db.select().from(stripePayment).where(eq(stripePayment.id, paymentId)))[0]
          .reviewRequired,
      ).toBe(true);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(0);
      // An explicit decision on this receipt can approve it; old cause keys remain
      // intact so warning delivery retries cannot override that decision.
      await db
        .update(stripePayment)
        .set({ reviewRequired: false })
        .where(eq(stripePayment.id, paymentId));
      expect((await accounting.apply(payment)).status).toBe('paid');
      await accounting.hold(
        f.customer.stripeId!,
        f.customer.accountId,
        paymentId,
        'fraud_warning:fixture',
      );
      expect(
        (await db.select().from(stripeCustomer).where(eq(stripeCustomer.id, f.customer.id)))[0]
          .reviewRequired,
      ).toBe(false);
    } finally {
      await f.cleanup();
    }
  },
);

// The fixture models Stripe's idempotency and invoice/charge contracts, while
// exercising the real SQL reservations, provider validation and wallet writes.
function fakeStripe() {
  const sessions = new Map<string, Stripe.Checkout.Session>();
  const prices = new Map<string, Stripe.Price>();
  const intents = new Map<string, Stripe.PaymentIntent>();
  const charges = new Map<string, Stripe.Charge>();
  const invoices = new Map<string, Stripe.Invoice>();
  const invoicePayments = new Map<string, Stripe.InvoicePayment[]>();
  const subscriptionData: Stripe.Subscription[] = [];
  let createCalls = 0;
  let failSessionLines = false;
  const api = {
    accounts: { retrieveCurrent: async () => ({ id: config().accountId }) },
    customers: {
      create: async (_params: unknown, options: { idempotencyKey: string }) => ({
        id: `cus_${options.idempotencyKey.split(':').at(-1)}`,
      }),
    },
    prices: {
      list: async ({ lookup_keys }: { lookup_keys: string[] }) => ({
        data: lookup_keys.map(key => {
          const monthly = key.includes('_monthly_');
          const amount = Number(key.split('_').at(-1));
          const currency = key.includes('_eur_') ? 'eur' : 'usd';
          const price = {
            id: `price_${key}`,
            currency,
            livemode: false,
            type: monthly ? 'recurring' : 'one_time',
            unit_amount: monthly ? amount * 100 : null,
            recurring: monthly ? { interval: 'month', interval_count: 1 } : null,
            custom_unit_amount: monthly ? null : { enabled: true },
          } as unknown as Stripe.Price;
          prices.set(price.id, price);
          return price;
        }),
      }),
    },
    subscriptions: {
      list: () => ({ autoPagingToArray: async () => subscriptionData }),
      retrieve: async (id: string) => subscriptionData.find(s => s.id === id)!,
      cancel: async (id: string) => {
        const subscription = subscriptionData.find(s => s.id === id)!;
        subscription.status = 'canceled';
        return subscription;
      },
    },
    checkout: {
      sessions: {
        create: async (
          params: Stripe.Checkout.SessionCreateParams,
          options: { idempotencyKey: string },
        ) => {
          const id = `cs_${options.idempotencyKey.split(':').at(-1)}`;
          if (sessions.has(id)) return sessions.get(id)!;
          createCalls++;
          const price = prices.get(params.line_items![0].price!)!;
          const session = {
            id,
            metadata: params.metadata,
            customer: params.customer,
            mode: params.mode,
            livemode: false,
            currency: price.currency,
            invoice: null,
            subscription: null,
            payment_intent: null,
            status: 'open',
            payment_status: 'unpaid',
            url: `https://checkout.stripe.com/c/pay/${id}`,
            amount_total: null,
            total_details: { amount_tax: 0 },
            priceId: price.id,
          } as unknown as Stripe.Checkout.Session;
          sessions.set(id, session);
          return session;
        },
        retrieve: async (id: string) => sessions.get(id)!,
        expire: async (id: string) => {
          const session = sessions.get(id)!;
          session.status = 'expired';
          return session;
        },
        listLineItems: async (id: string) => {
          if (failSessionLines) throw new Error('Stripe is temporarily unavailable');
          return {
            has_more: false,
            data: [
              {
                quantity: 1,
                price: { id: (sessions.get(id) as unknown as { priceId: string }).priceId },
              },
            ],
          };
        },
      },
    },
    paymentIntents: { retrieve: async (id: string) => intents.get(id)! },
    charges: { retrieve: async (id: string) => charges.get(id)! },
    invoices: {
      retrieve: async (id: string) => invoices.get(id)!,
      listLineItems: async (id: string) => ({
        has_more: false,
        data: [
          {
            quantity: 1,
            pricing: {
              price_details: {
                price: (invoices.get(id) as unknown as { priceId: string }).priceId,
              },
            },
            parent: { subscription_item_details: { proration: false } },
          },
        ],
      }),
    },
    invoicePayments: {
      list: async ({ invoice }: { invoice: string }) => ({
        data: invoicePayments.get(invoice) ?? [],
        has_more: false,
      }),
    },
  };
  function settle(session: Stripe.Checkout.Session, amount: number) {
    const id = `pi_${crypto.randomUUID()}`;
    const chargeId = `ch_${crypto.randomUUID()}`;
    intents.set(id, {
      id,
      customer: session.customer,
      currency: session.currency,
      amount_received: amount,
      status: 'succeeded',
      latest_charge: chargeId,
      livemode: false,
    } as Stripe.PaymentIntent);
    charges.set(chargeId, {
      id: chargeId,
      customer: session.customer,
      payment_intent: id,
      paid: true,
      captured: true,
      created: 1791530000,
      amount_refunded: 0,
      refunded: false,
      disputed: false,
      livemode: false,
    } as Stripe.Charge);
    session.status = 'complete';
    session.payment_status = 'paid';
    session.amount_total = amount;
    session.payment_intent = id;
    return id;
  }
  return {
    api: api as unknown as Stripe,
    sessions,
    intents,
    charges,
    invoices,
    invoicePayments,
    subscriptionData,
    settle,
    createCalls: () => createCalls,
    failSessionRefresh: () => {
      failSessionLines = true;
    },
  };
}

test.skipIf(!enabled)(
  'checkout retries recover the same session; monthly reservations prevent duplicates and cancellation releases them',
  async () => {
    const f = await fixture();
    const remote = fakeStripe();
    const service = createSupportService(db, () => remote.api, config, rates);
    try {
      const input: SupportCheckoutInput = {
        kind: 'monthly',
        currency: 'EUR',
        amount: 5,
        requestId: crypto.randomUUID(),
      };
      expect(priceLookupKey(input)).toBe('swubase_support_monthly_eur_5');
      const first = await service.checkout(f.userId, input);
      expect(await service.checkout(f.userId, input)).toEqual(first);
      expect(remote.createCalls()).toBe(1);
      await expect(service.checkout(f.userId, { ...input, amount: 10 })).rejects.toThrow();
      await expect(
        service.checkout(f.userId, { ...input, requestId: crypto.randomUUID() }),
      ).rejects.toThrow();
      expect((await service.overview(f.userId)).pendingCheckout?.requestId).toBe(input.requestId);
      await expect(service.confirm('someone-else', input.requestId)).rejects.toThrow();
      expect((await service.cancel(f.userId, input.requestId)).status).toBe('expired');
      await service.checkout(f.userId, { ...input, requestId: crypto.randomUUID() });
      expect(remote.createCalls()).toBe(2);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'checkout return and webhook replay share verified awards; refunds hold future payments',
  async () => {
    const f = await fixture();
    const remote = fakeStripe();
    const service = createSupportService(db, () => remote.api, config, rates);
    try {
      const input: SupportCheckoutInput = {
        kind: 'one_time',
        currency: 'USD',
        requestId: crypto.randomUUID(),
      };
      await service.checkout(f.userId, input);
      const session = [...remote.sessions.values()][0];
      expect((await service.confirm(f.userId, input.requestId)).status).toBe('pending');
      const paymentId = remote.settle(session, 750);
      const event = {
        type: 'checkout.session.completed',
        livemode: false,
        data: { object: { id: session.id } },
      } as Stripe.Event;
      await Promise.all([
        service.webhook(event),
        service.confirm(f.userId, input.requestId),
        service.webhook(event),
      ]);
      expect((await service.confirm(f.userId, input.requestId)).credits).toBe(7500);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(2);
      const charge = remote.charges.get(String(remote.intents.get(paymentId)!.latest_charge))!;
      charge.amount_refunded = 100;
      await service.webhook({
        type: 'charge.refunded',
        livemode: false,
        data: { object: { id: charge.id } },
      } as Stripe.Event);
      expect((await service.confirm(f.userId, input.requestId)).status).toBe('review');
      await expect(
        service.checkout(f.userId, { ...input, requestId: crypto.randomUUID() }),
      ).rejects.toThrow();
      await db
        .update(stripeCustomer)
        .set({ reviewRequired: false })
        .where(eq(stripeCustomer.id, f.customer.id));
      await service.confirm(f.userId, input.requestId);
      await service.webhook({
        type: 'charge.refunded',
        livemode: false,
        data: { object: { id: charge.id } },
      } as Stripe.Event);
      expect(
        (await db.select().from(stripeCustomer).where(eq(stripeCustomer.id, f.customer.id)))[0]
          .reviewRequired,
      ).toBe(false);
      charge.amount_refunded = 200;
      await service.webhook({
        type: 'charge.refunded',
        livemode: false,
        data: { object: { id: charge.id } },
      } as Stripe.Event);
      expect(
        (await db.select().from(stripeCustomer).where(eq(stripeCustomer.id, f.customer.id)))[0]
          .reviewRequired,
      ).toBe(true);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(2);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'initial subscription invoices and renewals grant once per real PaymentIntent; manual payments do not',
  async () => {
    const f = await fixture();
    const remote = fakeStripe();
    const service = createSupportService(db, () => remote.api, config, rates);
    try {
      const input: SupportCheckoutInput = {
        kind: 'monthly',
        currency: 'EUR',
        amount: 10,
        requestId: crypto.randomUUID(),
      };
      await service.checkout(f.userId, input);
      const session = [...remote.sessions.values()][0];
      const subscriptionId = `sub_${crypto.randomUUID()}`;
      session.subscription = subscriptionId;
      const priceId = `price_${priceLookupKey(input)}`;
      remote.subscriptionData.push({
        id: subscriptionId,
        metadata: session.metadata,
        customer: f.customer.stripeId,
        status: 'active',
        livemode: false,
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: priceId, currency: 'eur', unit_amount: 1000 },
              current_period_end: 1794208000,
            },
          ],
        },
      } as Stripe.Subscription);
      for (let month = 0; month < 2; month++) {
        const paymentId = remote.settle(session, 1000);
        const invoiceId = `in_${crypto.randomUUID()}`;
        if (!month) session.invoice = invoiceId;
        remote.invoices.set(invoiceId, {
          id: invoiceId,
          customer: f.customer.stripeId,
          currency: 'eur',
          status: 'paid',
          livemode: false,
          amount_paid: 1000,
          total: 1000,
          total_excluding_tax: 1000,
          priceId,
          parent: { subscription_details: { subscription: subscriptionId } },
        } as unknown as Stripe.Invoice);
        remote.invoicePayments.set(invoiceId, [
          { payment: { type: 'payment_intent', payment_intent: paymentId }, amount_paid: 1000 },
        ] as Stripe.InvoicePayment[]);
        await service.invoiceReceipt(invoiceId);
        await service.invoiceReceipt(invoiceId);
      }
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(4);
      expect((await service.confirm(f.userId, input.requestId)).credits).toBe(11190);
      await expect(
        service.checkout(f.userId, { ...input, requestId: crypto.randomUUID() }),
      ).rejects.toThrow();
      const original = [...remote.invoices.values()][1];
      const invoice = { ...original, id: `in_${crypto.randomUUID()}` };
      remote.invoices.set(invoice.id, invoice);
      remote.invoicePayments.set(invoice.id, [
        { payment: { type: 'payment_record' }, amount_paid: 1000 },
      ] as Stripe.InvoicePayment[]);
      expect((await service.invoiceReceipt(invoice.id))?.status).toBe('review');
      expect(
        (await db.select().from(stripeCustomer).where(eq(stripeCustomer.id, f.customer.id)))[0]
          .reviewRequired,
      ).toBe(true);
      expect(
        (await db.select().from(stripeCheckout).where(eq(stripeCheckout.id, input.requestId)))[0]
          .reviewInvoiceId,
      ).toBe(invoice.id);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(4);
      const changedInvoice = {
        ...original,
        id: `in_${crypto.randomUUID()}`,
        priceId: 'price_changed',
      } as Stripe.Invoice;
      remote.invoices.set(changedInvoice.id, changedInvoice);
      expect((await service.invoiceReceipt(changedInvoice.id))?.status).toBe('review');
      expect(
        (await db.select().from(stripeCheckout).where(eq(stripeCheckout.id, input.requestId)))[0]
          .reviewInvoiceId,
      ).toBe(changedInvoice.id);
      await db
        .update(stripeCustomer)
        .set({ reviewRequired: false })
        .where(eq(stripeCustomer.id, f.customer.id));
      session.invoice = invoice.id;
      await service.confirm(f.userId, input.requestId);
      await service.invoiceReceipt(changedInvoice.id);
      expect(
        (await db.select().from(stripeCustomer).where(eq(stripeCustomer.id, f.customer.id)))[0]
          .reviewRequired,
      ).toBe(false);
      const extraPayment = remote.settle(session, 1100);
      const mismatchInvoice = { ...original, id: `in_${crypto.randomUUID()}` };
      remote.invoices.set(mismatchInvoice.id, mismatchInvoice);
      remote.invoicePayments.set(mismatchInvoice.id, [
        { payment: { type: 'payment_intent', payment_intent: extraPayment }, amount_paid: 1000 },
      ] as Stripe.InvoicePayment[]);
      expect((await service.invoiceReceipt(mismatchInvoice.id))?.status).toBe('review');
      expect(
        (await db.select().from(stripeCheckout).where(eq(stripeCheckout.id, input.requestId)))[0]
          .reviewInvoiceId,
      ).toBe(mismatchInvoice.id);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, f.userId)),
      ).toHaveLength(4);
      await db.delete(user).where(eq(user.id, f.userId));
      await service.invoiceReceipt(invoice.id);
      expect(remote.subscriptionData[0].status).toBe('canceled');
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'a failed pending receipt refresh preserves subscription management and checkout recovery',
  async () => {
    const f = await fixture();
    const remote = fakeStripe();
    const service = createSupportService(db, () => remote.api, config, rates);
    try {
      const input: SupportCheckoutInput = {
        kind: 'monthly',
        currency: 'USD',
        amount: 5,
        requestId: crypto.randomUUID(),
      };
      await service.checkout(f.userId, input);
      const session = [...remote.sessions.values()][0];
      remote.subscriptionData.push({
        id: 'sub_fixture',
        metadata: session.metadata,
        status: 'active',
        livemode: false,
        cancel_at_period_end: false,
        items: {
          data: [{ price: { currency: 'usd', unit_amount: 500 }, current_period_end: 1794208000 }],
        },
      } as Stripe.Subscription);
      remote.failSessionRefresh();
      const overview = await service.overview(f.userId);
      expect(overview.enabled).toBe(true);
      expect(overview.subscription?.amountCents).toBe(500);
      expect(overview.pendingCheckout?.requestId).toBe(input.requestId);
    } finally {
      await f.cleanup();
    }
  },
);

test('support routes require a session, enforce CSRF and reject untrusted checkout input', async () => {
  let actor = false;
  const called: string[] = [];
  const service = {
    overview: async () => ({ enabled: true }),
    checkout: async (id: string) => {
      called.push(id);
      return { url: 'https://checkout.stripe.com/test' };
    },
  } as unknown as ReturnType<typeof createSupportService>;
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        actor ? ({ id: 'owner' } as NonNullable<AuthExtension['Variables']['user']>) : null,
      );
      await next();
    })
    .route('/support', createSupportRoute(service));
  const input = { kind: 'monthly', currency: 'USD', amount: 5, requestId: crypto.randomUUID() };
  const request = (body: unknown, csrf = true) =>
    app.request('/support/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
      },
      body: JSON.stringify(body),
    });
  expect((await app.request('/support')).status).toBe(200);
  expect((await request(input)).status).toBe(401);
  actor = true;
  expect((await request(input, false)).status).toBe(403);
  expect((await request({ ...input, userId: 'other' })).status).toBe(400);
  expect((await request(input)).status).toBe(200);
  expect(called).toEqual(['owner']);
});

test('webhooks verify exact raw bytes, reject tampering and retry failures', async () => {
  const client = new Stripe('sk_test_fixture');
  const secret = 'whsec_fixture';
  let calls = 0;
  const service = {
    webhook: async () => {
      calls++;
      if (calls === 2) throw new Error('Temporary failure');
    },
  } as unknown as ReturnType<typeof createSupportService>;
  const app = createStripeWebhookRoute(
    service,
    () => client,
    () => secret,
  );
  const payload =
    '{ "id":"evt_fixture", "type":"invoice.paid", "livemode":false, "data":{"object":{"id":"in_fixture"}} }';
  const signature = await client.webhooks.generateTestHeaderStringAsync({ payload, secret });
  const send = (body: string) =>
    app.request('/', { method: 'POST', headers: { 'Stripe-Signature': signature }, body });
  expect((await send(payload + ' ')).status).toBe(400);
  expect(calls).toBe(0);
  expect((await send(payload)).status).toBe(200);
  expect((await send(payload)).status).toBe(503);
});
