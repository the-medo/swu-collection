import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { stripeCheckout, stripeCustomer, stripePayment } from '../../db/schema/stripe.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import type { SupportCurrency, SupportReceipt } from '../../../shared/types/support.ts';
import { dollarsFromEuroCents, exchangeRates } from './exchange.ts';
import { SupportError } from './config.ts';

export type PaidSupport = {
  paymentId: string;
  customerId: string;
  checkoutId: string;
  invoiceId: string | null;
  currency: SupportCurrency;
  amountCents: number;
  paidAt: Date;
  reviewRequired: boolean;
};

export function createStripeAccounting(database = db, rates = exchangeRates) {
  return {
    async apply(payment: PaidSupport): Promise<SupportReceipt> {
      if (
        !Number.isSafeInteger(payment.amountCents) ||
        payment.amountCents <= 0 ||
        payment.amountCents > 2_000_000_000
      )
        throw new SupportError('This support payment requires review.');
      // Rates are immutable once recorded. Replaying an old receipt doesn't
      // depend on today's FX service, even when the historical feed has aged out.
      const [saved] = await database
        .select()
        .from(stripePayment)
        .where(eq(stripePayment.id, payment.paymentId));
      const rate =
        payment.currency === 'EUR' && saved?.usdCents == null && !payment.reviewRequired
          ? await rates.at(payment.paidAt)
          : null;
      const usdCents =
        saved?.usdCents ??
        (payment.currency === 'USD'
          ? payment.amountCents
          : rate
            ? dollarsFromEuroCents(payment.amountCents, rate.usdPerEur)
            : null);
      return database.transaction(async tx => {
        const [customer] = await tx
          .select()
          .from(stripeCustomer)
          .where(eq(stripeCustomer.id, payment.customerId))
          .for('update');
        const [checkout] = await tx
          .select()
          .from(stripeCheckout)
          .where(eq(stripeCheckout.id, payment.checkoutId));
        if (!customer || !checkout || checkout.customerId !== customer.id)
          throw new SupportError('Support receipt could not be reconciled.');
        await tx
          .insert(stripePayment)
          .values({
            id: payment.paymentId,
            customerId: customer.id,
            checkoutId: checkout.id,
            invoiceId: payment.invoiceId,
            currency: payment.currency,
            amountCents: payment.amountCents,
            paidAt: payment.paidAt,
            usdCents,
            usdPerEur: rate?.usdPerEur ?? saved?.usdPerEur,
            rateDate: rate?.date ?? saved?.rateDate,
            reviewRequired:
              payment.reviewRequired ||
              customer.reviewKeys.includes(`payment:${payment.paymentId}`),
          })
          .onConflictDoNothing();
        const [receipt] = await tx
          .select()
          .from(stripePayment)
          .where(eq(stripePayment.id, payment.paymentId))
          .for('update');
        if (
          receipt.customerId !== customer.id ||
          receipt.checkoutId !== checkout.id ||
          receipt.currency !== payment.currency ||
          receipt.amountCents !== payment.amountCents ||
          receipt.invoiceId !== payment.invoiceId
        )
          throw new SupportError('Support receipt identity changed and requires review.');
        const held =
          receipt.reviewRequired ||
          payment.reviewRequired ||
          customer.reviewRequired ||
          !customer.userId ||
          checkout.userId !== customer.userId;
        if (payment.reviewRequired || !customer.userId || checkout.userId !== customer.userId) {
          await tx
            .update(stripePayment)
            .set({ reviewRequired: true })
            .where(eq(stripePayment.id, receipt.id));
          const reviewKey = `payment:${receipt.id}`;
          if (!customer.reviewKeys.includes(reviewKey))
            await tx
              .update(stripeCustomer)
              .set({ reviewRequired: true, reviewKeys: [...customer.reviewKeys, reviewKey] })
              .where(eq(stripeCustomer.id, customer.id));
        }
        if (held)
          return {
            status: 'review',
            credits: receipt.creditedAt ? receipt.usdCents! * 10 : 0,
            beskarCents: receipt.creditedAt ? receipt.usdCents! : 0,
          };
        const converted = receipt.usdCents ?? usdCents;
        if (!converted) throw new SupportError('Currency conversion is temporarily unavailable.');
        if (!receipt.creditedAt) {
          // Both grants and the provider checkpoint commit together. The wallet
          // trigger serializes these writes with shop purchases and other awards.
          await tx.insert(userCredits).values([
            {
              userId: customer.userId!,
              currency: 'credits',
              amount: converted * 10,
              source: 'stripe',
              sourceKey: `stripe:credits:${receipt.id}`,
            },
            {
              userId: customer.userId!,
              currency: 'beskar',
              amount: converted,
              source: 'stripe',
              sourceKey: `stripe:beskar:${receipt.id}`,
            },
          ]);
          await tx
            .update(stripePayment)
            .set({
              usdCents: converted,
              usdPerEur: receipt.usdPerEur ?? rate?.usdPerEur,
              rateDate: receipt.rateDate ?? rate?.date,
              creditedAt: new Date(),
            })
            .where(eq(stripePayment.id, receipt.id));
        }
        return { status: 'paid', credits: converted * 10, beskarCents: converted };
      });
    },
    async hold(
      customerStripeId: string,
      accountId: string,
      paymentId: string | null,
      cause?: string,
    ) {
      await database.transaction(async tx => {
        const [customer] = await tx
          .select()
          .from(stripeCustomer)
          .where(
            and(
              eq(stripeCustomer.stripeId, customerStripeId),
              eq(stripeCustomer.accountId, accountId),
            ),
          )
          .for('update');
        if (!customer) return;
        const reviewKey = cause ?? (paymentId ? `payment:${paymentId}` : 'unlinked_payment');
        if (customer.reviewKeys.includes(reviewKey)) return;
        const keys = new Set([...customer.reviewKeys, reviewKey]);
        if (paymentId) keys.add(`payment:${paymentId}`);
        await tx
          .update(stripeCustomer)
          .set({ reviewRequired: true, reviewKeys: [...keys] })
          .where(eq(stripeCustomer.id, customer.id));
        if (paymentId)
          await tx
            .update(stripePayment)
            .set({ reviewRequired: true })
            .where(and(eq(stripePayment.id, paymentId), eq(stripePayment.customerId, customer.id)));
      });
    },
  };
}
