import Stripe from 'stripe';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { stripeCheckout, stripeCustomer } from '../../db/schema/stripe.ts';
import type {
  SupportCheckoutInput,
  SupportCurrency,
  SupportOverview,
  SupportReceipt,
  SupportSubscription,
} from '../../../shared/types/support.ts';
import { createStripeAccounting } from './accounting.ts';
import { exchangeRates } from './exchange.ts';
import { stripeClient, supportConfig, SupportError, logSupportFailure } from './config.ts';

type Checkout = typeof stripeCheckout.$inferSelect;
type Customer = typeof stripeCustomer.$inferSelect;
const pending: SupportReceipt = { status: 'pending', credits: 0, beskarCents: 0 };
const expired: SupportReceipt = { status: 'expired', credits: 0, beskarCents: 0 };
const identifier = (value: string | { id: string } | null | undefined) =>
  typeof value === 'string' ? value : value?.id;
const activeSubscription = (subscription: Stripe.Subscription) =>
  !['canceled', 'incomplete_expired'].includes(subscription.status);
class PaymentMismatch extends SupportError {}
export const priceLookupKey = (input: SupportCheckoutInput) =>
  `swubase_support_${input.kind}_${input.currency.toLowerCase()}_${input.kind === 'monthly' ? input.amount : 'custom'}`;
const checkoutInput = (row: Checkout): SupportCheckoutInput =>
  row.kind === 'monthly'
    ? {
        kind: 'monthly',
        currency: row.currency,
        amount: row.amount as 5 | 10 | 20,
        requestId: row.id,
      }
    : { kind: 'one_time', currency: row.currency, requestId: row.id };

export function createSupportService(
  database = db,
  getClient = stripeClient,
  getConfig = supportConfig,
  rates = exchangeRates,
) {
  const accounting = createStripeAccounting(database, rates);
  let verified: { client: Stripe; accountId: string; until: number } | undefined;
  async function provider() {
    const config = getConfig();
    const client = getClient();
    if (
      !verified ||
      verified.client !== client ||
      verified.accountId !== config.accountId ||
      verified.until < Date.now()
    ) {
      const account = await client.accounts.retrieveCurrent();
      if (account.id !== config.accountId)
        throw new SupportError('Support account configuration does not match.');
      verified = { client, accountId: account.id, until: Date.now() + 300_000 };
    }
    return { client, config };
  }
  const ownerCustomer = async (userId: string) => {
    const { accountId } = getConfig();
    return (
      await database
        .select()
        .from(stripeCustomer)
        .where(and(eq(stripeCustomer.accountId, accountId), eq(stripeCustomer.userId, userId)))
    )[0];
  };
  async function customerFor(userId: string): Promise<Customer> {
    const { client, config } = await provider();
    await database
      .insert(stripeCustomer)
      .values({ accountId: config.accountId, userId })
      .onConflictDoNothing();
    const customer = await ownerCustomer(userId);
    if (!customer) throw new SupportError('Support account could not be prepared.');
    if (!customer.stripeId) {
      const remote = await client.customers.create(
        { metadata: { app: 'swubase', swubase_customer_id: customer.id } },
        { idempotencyKey: `swubase:customer:${customer.id}` },
      );
      const [updated] = await database
        .update(stripeCustomer)
        .set({ stripeId: remote.id })
        .where(and(eq(stripeCustomer.id, customer.id), eq(stripeCustomer.userId, userId)))
        .returning();
      if (!updated) throw new SupportError('Support account is no longer available.', 404);
      return updated;
    }
    return customer;
  }
  async function subscriptions(customer: Customer) {
    if (!customer.stripeId) return [];
    const { client } = await provider();
    return client.subscriptions
      .list({ customer: customer.stripeId, status: 'all', limit: 100 })
      .autoPagingToArray({ limit: 1000 });
  }
  async function ownedCheckout(userId: string, requestId: string) {
    const customer = await ownerCustomer(userId);
    const [row] = await database
      .select()
      .from(stripeCheckout)
      .where(and(eq(stripeCheckout.id, requestId), eq(stripeCheckout.userId, userId)));
    if (!row || !customer || row.customerId !== customer.id)
      throw new SupportError('Support checkout not found.', 404);
    return { row, customer };
  }
  function checkMode(object: { livemode: boolean }) {
    if (object.livemode !== getConfig().live)
      throw new SupportError('Support payment mode does not match.');
  }
  async function createRemoteCheckout(row: Checkout, customer: Customer) {
    const { client, config } = await provider();
    if (row.state === 'expired')
      throw new SupportError('This checkout expired. Please start a new one.', 409);
    if (row.stripeId) return client.checkout.sessions.retrieve(row.stripeId);
    // Stripe retains idempotency keys for at least 24 hours. Never recreate an
    // older unknown session after that protection can have expired.
    if (!row.expiresAt || row.expiresAt.getTime() < Date.now() + 31 * 60_000)
      throw new SupportError(
        'This checkout expired. Please contact support if it still appears pending.',
        409,
      );
    const metadata = { app: 'swubase', swubase_checkout_id: row.id };
    const session = await client.checkout.sessions.create(
      {
        customer: customer.stripeId!,
        mode: row.kind === 'monthly' ? 'subscription' : 'payment',
        line_items: [{ price: row.priceId, quantity: 1 }],
        metadata,
        ...(row.kind === 'monthly'
          ? { subscription_data: { metadata } }
          : { payment_intent_data: { metadata } }),
        success_url: `${config.origin}/support?supportCheckout=success&supportRequest=${row.id}`,
        cancel_url: `${config.origin}/support?supportCheckout=cancelled&supportRequest=${row.id}`,
        expires_at: Math.floor(row.expiresAt.getTime() / 1000),
      },
      { idempotencyKey: `swubase:checkout:${row.id}` },
    );
    checkMode(session);
    await database
      .update(stripeCheckout)
      .set({
        stripeId: session.id,
        url: session.url,
        state:
          session.status === 'expired'
            ? 'expired'
            : session.status === 'complete'
              ? 'complete'
              : 'open',
      })
      .where(
        and(eq(stripeCheckout.id, row.id), inArray(stripeCheckout.state, ['creating', 'open'])),
      );
    return session;
  }
  async function validateSession(
    session: Stripe.Checkout.Session,
    row: Checkout,
    customer: Customer,
  ) {
    checkMode(session);
    if (
      session.metadata?.app !== 'swubase' ||
      session.metadata.swubase_checkout_id !== row.id ||
      identifier(session.customer) !== customer.stripeId ||
      session.mode !== (row.kind === 'monthly' ? 'subscription' : 'payment') ||
      (session.currency && session.currency.toUpperCase() !== row.currency)
    )
      throw new SupportError('Support checkout identity does not match.');
    const { client } = await provider();
    const lines = await client.checkout.sessions.listLineItems(session.id, { limit: 2 });
    if (
      lines.has_more ||
      lines.data.length !== 1 ||
      lines.data[0].quantity !== 1 ||
      lines.data[0].price?.id !== row.priceId
    )
      throw new SupportError('Support checkout items do not match.');
  }
  async function paidIntent(
    paymentId: string,
    customer: Customer,
    row: Checkout,
    amountCents: number,
    invoiceId: string | null,
    expectedGross: number,
  ): Promise<SupportReceipt> {
    const { client } = await provider();
    const intent = await client.paymentIntents.retrieve(paymentId);
    checkMode(intent);
    if (
      identifier(intent.customer) !== customer.stripeId ||
      intent.currency.toUpperCase() !== row.currency ||
      intent.amount_received !== expectedGross
    )
      throw new PaymentMismatch('Support payment identity does not match.');
    if (intent.status !== 'succeeded' || !identifier(intent.latest_charge)) return pending;
    const charge = await client.charges.retrieve(identifier(intent.latest_charge)!);
    checkMode(charge);
    if (
      !charge.paid ||
      !charge.captured ||
      identifier(charge.payment_intent) !== intent.id ||
      identifier(charge.customer) !== customer.stripeId
    )
      return pending;
    const reviewRequired =
      charge.refunded ||
      charge.amount_refunded > 0 ||
      charge.disputed ||
      charge.fraud_details?.user_report === 'fraudulent' ||
      charge.outcome?.risk_level === 'highest';
    return accounting.apply({
      paymentId: intent.id,
      customerId: customer.id,
      checkoutId: row.id,
      invoiceId,
      amountCents,
      currency: row.currency,
      paidAt: new Date(charge.created * 1000),
      reviewRequired,
    });
  }
  async function invoiceReceipt(invoiceId: string): Promise<SupportReceipt | null> {
    const { client } = await provider();
    const invoice = await client.invoices.retrieve(invoiceId);
    checkMode(invoice);
    const subscriptionId = identifier(invoice.parent?.subscription_details?.subscription);
    if (!subscriptionId) return null;
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    if (subscription.metadata.app !== 'swubase' || !subscription.metadata.swubase_checkout_id)
      return null;
    checkMode(subscription);
    const [row] = await database
      .select()
      .from(stripeCheckout)
      .where(eq(stripeCheckout.id, subscription.metadata.swubase_checkout_id));
    if (!row) throw new SupportError('Support subscription receipt is not available yet.');
    const [customer] = await database
      .select()
      .from(stripeCustomer)
      .where(eq(stripeCustomer.id, row.customerId));
    if (
      !customer ||
      customer.accountId !== getConfig().accountId ||
      identifier(subscription.customer) !== customer.stripeId ||
      identifier(invoice.customer) !== customer.stripeId ||
      row.kind !== 'monthly' ||
      invoice.currency.toUpperCase() !== row.currency ||
      (row.subscriptionId && row.subscriptionId !== subscriptionId)
    )
      throw new SupportError('Support subscription identity does not match.');
    await database
      .update(stripeCheckout)
      .set({ subscriptionId, state: 'complete' })
      .where(eq(stripeCheckout.id, row.id));
    // Direct database deletion can bypass application lifecycle checks. Stop
    // future renewals as soon as an orphaned subscription is observed.
    if (!customer.userId) {
      await accounting.hold(customer.stripeId!, customer.accountId, null, 'owner_removed');
      if (activeSubscription(subscription))
        await client.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false });
    }
    if (invoice.status !== 'paid' || invoice.amount_paid <= 0) return pending;
    const requireReview = async (): Promise<SupportReceipt> => {
      await database.transaction(async tx => {
        const [locked] = await tx
          .select()
          .from(stripeCustomer)
          .where(eq(stripeCustomer.id, customer.id))
          .for('update');
        const reviewKey = `invoice:${invoice.id}`;
        if (locked.reviewKeys.includes(reviewKey)) return;
        await tx
          .update(stripeCustomer)
          .set({ reviewRequired: true, reviewKeys: [...locked.reviewKeys, reviewKey] })
          .where(eq(stripeCustomer.id, customer.id));
        await tx
          .update(stripeCheckout)
          .set({ reviewInvoiceId: invoice.id })
          .where(eq(stripeCheckout.id, row.id));
      });
      return { status: 'review', credits: 0, beskarCents: 0 };
    };
    const lines = await client.invoices.listLineItems(invoice.id, { limit: 100 });
    if (
      lines.has_more ||
      lines.data.length !== 1 ||
      lines.data[0].quantity !== 1 ||
      identifier(lines.data[0].pricing?.price_details?.price) !== row.priceId ||
      lines.data[0].parent?.subscription_item_details?.proration
    )
      return requireReview();
    const payments = await client.invoicePayments.list({
      invoice: invoice.id,
      status: 'paid',
      limit: 2,
    });
    // Credit notes, manual/out-of-band settlements, customer balance and split
    // invoice payments are not fresh supporter payments to reward automatically.
    const paid = payments.data[0];
    if (
      payments.has_more ||
      payments.data.length !== 1 ||
      paid.payment.type !== 'payment_intent' ||
      !identifier(paid.payment.payment_intent) ||
      paid.amount_paid !== invoice.total ||
      invoice.amount_paid !== invoice.total ||
      invoice.total <= 0
    )
      return requireReview();
    const amount =
      invoice.total_excluding_tax ??
      invoice.total - (invoice.total_taxes ?? []).reduce((sum, tax) => sum + tax.amount, 0);
    try {
      return await paidIntent(
        identifier(paid.payment.payment_intent)!,
        customer,
        row,
        amount,
        invoice.id,
        invoice.total,
      );
    } catch (error) {
      if (error instanceof PaymentMismatch) return requireReview();
      throw error;
    }
  }
  async function sessionReceipt(sessionId: string): Promise<SupportReceipt | null> {
    const { client } = await provider();
    const session = await client.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.app !== 'swubase' || !session.metadata.swubase_checkout_id) return null;
    const [row] = await database
      .select()
      .from(stripeCheckout)
      .where(eq(stripeCheckout.id, session.metadata.swubase_checkout_id));
    if (!row) throw new SupportError('Support checkout receipt is not available yet.');
    const [customer] = await database
      .select()
      .from(stripeCustomer)
      .where(eq(stripeCustomer.id, row.customerId));
    if (
      !customer ||
      customer.accountId !== getConfig().accountId ||
      (row.stripeId && row.stripeId !== session.id)
    )
      throw new SupportError('Support checkout account does not match.');
    await validateSession(session, row, customer);
    const subscriptionId = identifier(session.subscription);
    await database
      .update(stripeCheckout)
      .set({
        stripeId: session.id,
        subscriptionId: subscriptionId ?? row.subscriptionId,
        state:
          session.status === 'complete'
            ? 'complete'
            : session.status === 'expired'
              ? 'expired'
              : 'open',
      })
      .where(eq(stripeCheckout.id, row.id));
    if (session.status === 'expired') return expired;
    if (session.status !== 'complete' || session.payment_status !== 'paid') return pending;
    if (row.kind === 'monthly') {
      // The Checkout invoice is the initial invoice. A later renewal must never
      // change the receipt shown when revisiting this success URL.
      return identifier(session.invoice) ? invoiceReceipt(identifier(session.invoice)!) : pending;
    }
    if (!identifier(session.payment_intent) || !session.amount_total) return pending;
    return paidIntent(
      identifier(session.payment_intent)!,
      customer,
      row,
      session.amount_total - (session.total_details?.amount_tax ?? 0),
      null,
      session.amount_total,
    );
  }
  return {
    async overview(userId?: string): Promise<SupportOverview> {
      const empty: SupportOverview = {
        enabled: false,
        sandbox: false,
        usdPerEur: null,
        rateDate: null,
        subscription: null,
        reviewRequired: false,
        pendingCheckout: null,
      };
      try {
        getConfig();
      } catch (error) {
        if (error instanceof SupportError) return empty;
        throw error;
      }
      const { config } = await provider();
      let rate: Awaited<ReturnType<typeof rates.at>> | null = null;
      try {
        rate = await rates.at(new Date());
      } catch {
        /* Checkout remains available; accounting retries when ECB is back. */
      }
      const customer = userId ? await ownerCustomer(userId) : undefined;
      let subscription: SupportSubscription | null = null;
      let pendingCheckout: SupportCheckoutInput | null = null;
      if (customer) {
        // Refresh only this owner's pending sessions, recovering lost responses
        // before allowing another monthly checkout.
        const rows = await database
          .select()
          .from(stripeCheckout)
          .where(
            and(
              eq(stripeCheckout.customerId, customer.id),
              eq(stripeCheckout.kind, 'monthly'),
              inArray(stripeCheckout.state, ['creating', 'open']),
            ),
          );
        for (const row of rows) {
          if (row.stripeId) {
            try {
              await sessionReceipt(row.stripeId);
            } catch (error) {
              logSupportFailure(error);
            }
          }
          const [fresh] = await database
            .select()
            .from(stripeCheckout)
            .where(eq(stripeCheckout.id, row.id));
          if (fresh && ['creating', 'open'].includes(fresh.state))
            pendingCheckout = checkoutInput(fresh);
        }
        const remote = (await subscriptions(customer)).find(
          s => s.metadata.app === 'swubase' && activeSubscription(s),
        );
        if (remote) {
          const item = remote.items.data[0];
          if (item && ['eur', 'usd'].includes(item.price.currency))
            subscription = {
              currency: item.price.currency.toUpperCase() as SupportCurrency,
              amountCents: item.price.unit_amount ?? 0,
              status: remote.status,
              cancelAtPeriodEnd: remote.cancel_at_period_end,
              periodEnd: item.current_period_end
                ? new Date(item.current_period_end * 1000).toISOString()
                : null,
            };
        }
      }
      return {
        enabled: true,
        sandbox: !config.live,
        usdPerEur: rate?.usdPerEur ?? null,
        rateDate: rate?.date ?? null,
        subscription,
        reviewRequired: userId ? ((await ownerCustomer(userId))?.reviewRequired ?? false) : false,
        pendingCheckout,
      };
    },
    async checkout(userId: string, input: SupportCheckoutInput) {
      const customer = await customerFor(userId);
      if (customer.reviewRequired)
        throw new SupportError('Your support account needs review before another payment.', 409);
      let [row] = await database
        .select()
        .from(stripeCheckout)
        .where(eq(stripeCheckout.id, input.requestId));
      if (!row) {
        const { client } = await provider();
        const prices = await client.prices.list({
          lookup_keys: [priceLookupKey(input)],
          active: true,
          limit: 2,
        });
        const price = prices.data[0];
        if (
          prices.data.length !== 1 ||
          price.currency.toUpperCase() !== input.currency ||
          (input.kind === 'monthly'
            ? price.type !== 'recurring' ||
              price.recurring?.interval !== 'month' ||
              price.recurring.interval_count !== 1 ||
              price.unit_amount !== input.amount * 100
            : price.type !== 'one_time' || !price.custom_unit_amount)
        )
          throw new SupportError('The selected support option is not configured.');
        checkMode(price);
        // Any active subscription for this customer prevents a second one,
        // including a subscription temporarily awaiting payment or cancellation.
        row = await database.transaction(async tx => {
          await tx
            .select()
            .from(stripeCustomer)
            .where(eq(stripeCustomer.id, customer.id))
            .for('update');
          const [existing] = await tx
            .select()
            .from(stripeCheckout)
            .where(eq(stripeCheckout.id, input.requestId));
          if (existing) return existing;
          if (input.kind === 'monthly') {
            const [open] = await tx
              .select()
              .from(stripeCheckout)
              .where(
                and(
                  eq(stripeCheckout.customerId, customer.id),
                  eq(stripeCheckout.kind, 'monthly'),
                  inArray(stripeCheckout.state, ['creating', 'open']),
                ),
              );
            if (open)
              throw new SupportError(
                'You have an unfinished monthly checkout. Resume or cancel it first.',
                409,
              );
            if ((await subscriptions(customer)).some(activeSubscription))
              throw new SupportError(
                'You already have a monthly subscription. Use Manage subscription.',
                409,
              );
          }
          return (
            await tx
              .insert(stripeCheckout)
              .values({
                id: input.requestId,
                customerId: customer.id,
                userId,
                kind: input.kind,
                currency: input.currency,
                amount: input.kind === 'monthly' ? input.amount : null,
                priceId: price.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
              })
              .returning()
          )[0];
        });
      }
      if (row.userId !== userId || row.customerId !== customer.id)
        throw new SupportError('Support checkout not found.', 404);
      if (
        row.kind !== input.kind ||
        row.currency !== input.currency ||
        row.amount !== (input.kind === 'monthly' ? input.amount : null)
      )
        throw new SupportError('This request was already used for another support option.', 409);
      const session = await createRemoteCheckout(row, customer);
      await validateSession(session, row, customer);
      if (session.status !== 'open' || !session.url)
        throw new SupportError('This checkout is already completed or expired.', 409);
      const url = new URL(session.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
        throw new SupportError('Support checkout URL is not valid.');
      return { url: session.url };
    },
    async confirm(userId: string, requestId: string) {
      const { row, customer } = await ownedCheckout(userId, requestId);
      if (row.state === 'expired') return expired;
      const session = await createRemoteCheckout(row, customer);
      return (await sessionReceipt(session.id)) ?? pending;
    },
    async cancel(userId: string, requestId: string) {
      const { row, customer } = await ownedCheckout(userId, requestId);
      if (row.state === 'expired') return expired;
      const { client } = await provider();
      if (!row.stripeId && row.expiresAt && row.expiresAt.getTime() < Date.now()) {
        await database
          .update(stripeCheckout)
          .set({ state: 'expired' })
          .where(eq(stripeCheckout.id, row.id));
        return expired;
      }
      let session = await createRemoteCheckout(row, customer);
      await validateSession(session, row, customer);
      if (session.status === 'open') {
        try {
          session = await client.checkout.sessions.expire(session.id);
        } catch {
          session = await client.checkout.sessions.retrieve(session.id);
          if (session.status === 'open')
            throw new SupportError('Checkout could not be cancelled. Please try again.');
        }
      }
      return (await sessionReceipt(session.id)) ?? pending;
    },
    async portal(userId: string) {
      const customer = await ownerCustomer(userId);
      if (!customer?.stripeId)
        throw new SupportError('You do not have a support account yet.', 404);
      const { client, config } = await provider();
      const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
      if (!configuration) throw new SupportError('Subscription management is not configured.');
      const portalConfig = await client.billingPortal.configurations.retrieve(configuration);
      checkMode(portalConfig);
      if (
        !portalConfig.active ||
        portalConfig.features.subscription_update.enabled ||
        !portalConfig.features.subscription_cancel.enabled ||
        portalConfig.features.subscription_cancel.mode !== 'at_period_end'
      )
        throw new SupportError('Subscription management needs configuration review.');
      const session = await client.billingPortal.sessions.create({
        customer: customer.stripeId,
        configuration,
        return_url: `${config.origin}/support`,
      });
      return { url: session.url };
    },
    async webhook(event: Stripe.Event) {
      checkMode(event);
      const object = event.data.object as unknown as {
        id: string;
        charge?: string | { id: string };
        customer?: string | { id: string };
        payment_intent?: string | { id: string };
      };
      if (
        [
          'checkout.session.completed',
          'checkout.session.async_payment_succeeded',
          'checkout.session.async_payment_failed',
          'checkout.session.expired',
        ].includes(event.type)
      )
        await sessionReceipt(object.id);
      else if (['invoice.paid', 'invoice.payment_succeeded'].includes(event.type))
        await invoiceReceipt(object.id);
      else if (
        [
          'charge.refunded',
          'charge.dispute.created',
          'charge.dispute.updated',
          'radar.early_fraud_warning.created',
        ].includes(event.type)
      ) {
        const { client, config } = await provider();
        const chargeId = event.type === 'charge.refunded' ? object.id : identifier(object.charge);
        if (!chargeId) return;
        const charge = await client.charges.retrieve(chargeId);
        checkMode(charge);
        const reviewKey =
          event.type === 'charge.refunded'
            ? `refund:${charge.id}:${charge.amount_refunded}`
            : event.type === 'radar.early_fraud_warning.created'
              ? `fraud_warning:${object.id}`
              : `dispute:${object.id}:${(await client.disputes.retrieve(object.id)).status}`;
        if (identifier(charge.customer))
          await accounting.hold(
            identifier(charge.customer)!,
            config.accountId,
            identifier(charge.payment_intent) ?? null,
            reviewKey,
          );
      }
    },
    // Operator reconciliation deliberately retains a sticky customer hold.
    // Clearing a hold requires a human accounting decision, documented separately.
    invoiceReceipt,
    sessionReceipt,
  };
}
export const supportService = createSupportService();
