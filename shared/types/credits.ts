import { z } from 'zod';

export const creditUsersQuery = z.strictObject({
  search: z.string().trim().max(120).default(''),
});
export const creditUserParams = z.strictObject({
  userId: z.string().min(1).max(200),
});
export const creditGrantAmount = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const beskarGrantAmount = z
  .number()
  .min(0.01)
  .max(Number.MAX_SAFE_INTEGER / 100)
  .refine(
    value => Number(value.toFixed(2)) === value && Number.isSafeInteger(Math.round(value * 100)),
    'Use at most two decimal places.',
  );
export const creditCurrency = z.enum(['credits', 'beskar']);
export type CreditCurrency = z.infer<typeof creditCurrency>;
const grantFields = {
  requestId: z.uuid(),
};
export const creditGrantInput = z.union([
  z.strictObject({
    ...grantFields,
    currency: z.literal('credits').default('credits'),
    amount: creditGrantAmount,
  }),
  z.strictObject({ ...grantFields, currency: z.literal('beskar'), amount: beskarGrantAmount }),
]);
export type CreditGrantInput = z.input<typeof creditGrantInput>;

export type CreditUser = {
  id: string;
  name: string;
  displayName: string;
  email: string;
  balance: number | null;
  beskarCents: number;
};
export type CreditUsers = { users: CreditUser[]; hasMore: boolean };
export type CreditGrantResult = {
  userId: string;
  amount: number;
  currency: CreditCurrency;
  balance: number;
  beskarCents: number;
  applied: boolean;
};

export const shopItemId = z.enum(['achievement-slot', 'battlefield-slot']);
export type ShopItemId = z.infer<typeof shopItemId>;
export const shopPurchaseInput = z.strictObject({ itemId: shopItemId, requestId: z.uuid() });
export type ShopPurchaseInput = z.infer<typeof shopPurchaseInput>;
export const SHOP_ITEMS = [
  {
    id: 'achievement-slot',
    name: 'Achievement slot',
    description: 'Showcase one more tournament achievement on your profile.',
    priceCents: 500,
    maxSlots: 2_147_483_647,
  },
  {
    id: 'battlefield-slot',
    name: 'Battlefield slot',
    description: 'Save one more Battlefield layout.',
    priceCents: 300,
    maxSlots: 100,
  },
] as const;
export type UserWallet = {
  credits: number;
  beskarCents: number;
  achievementLimit: number;
  battlefieldLimit: number;
};
export type ShopPurchaseResult = {
  itemId: ShopItemId;
  transactionId: string;
  applied: boolean;
  wallet: UserWallet;
};
export const transactionQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export type UserTransaction = {
  id: string;
  currency: CreditCurrency;
  amount: number;
  source: string;
  itemId: ShopItemId | null;
  createdAt: string;
};
export type UserTransactions = {
  page: number;
  pageSize: number;
  total: number;
  transactions: UserTransaction[];
};

export const formatBeskar = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const formatCurrencyAmount = (currency: CreditCurrency, amount: number) =>
  currency === 'beskar' ? formatBeskar(amount) : amount.toLocaleString();
