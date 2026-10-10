import { z } from 'zod';

export const supportCurrency = z.enum(['EUR', 'USD']);
export type SupportCurrency = z.infer<typeof supportCurrency>;
export const SUPPORT_MONTHLY_AMOUNTS = [5, 10, 20] as const;
export const supportCheckoutInput = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('monthly'),
    currency: supportCurrency,
    amount: z.union([z.literal(5), z.literal(10), z.literal(20)]),
    requestId: z.uuid(),
  }),
  z.strictObject({ kind: z.literal('one_time'), currency: supportCurrency, requestId: z.uuid() }),
]);
export type SupportCheckoutInput = z.infer<typeof supportCheckoutInput>;
export type SupportSubscription = {
  currency: SupportCurrency;
  amountCents: number;
  status: string;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
};
export type SupportOverview = {
  enabled: boolean;
  sandbox: boolean;
  usdPerEur: string | null;
  rateDate: string | null;
  subscription: SupportSubscription | null;
  reviewRequired: boolean;
  pendingCheckout: SupportCheckoutInput | null;
};
export type SupportReceipt = {
  status: 'pending' | 'paid' | 'expired' | 'review';
  credits: number;
  beskarCents: number;
};
