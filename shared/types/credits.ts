import { z } from 'zod';

export const creditUsersQuery = z.strictObject({
  search: z.string().trim().max(120).default(''),
});
export const creditUserParams = z.strictObject({
  userId: z.string().min(1).max(200),
});
export const creditGrantAmount = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const creditGrantInput = z.strictObject({
  amount: creditGrantAmount,
  requestId: z.uuid(),
});
export type CreditGrantInput = z.infer<typeof creditGrantInput>;

export type CreditUser = {
  id: string;
  name: string;
  displayName: string;
  email: string;
  balance: number | null;
};
export type CreditUsers = { users: CreditUser[]; hasMore: boolean };
export type CreditGrantResult = {
  userId: string;
  amount: number;
  balance: number;
  applied: boolean;
};
