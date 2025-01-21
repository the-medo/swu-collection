import { z } from 'zod';
import { countryList, currencyList } from '../server/db/lists.ts';

export const zUserUpdateRequest = z.object({
  displayName: z.string().optional(),
  country: z
    .string()
    .optional()
    .refine(val => val && Object.hasOwn(countryList, val), {
      message: 'Invalid country code',
    }),
  state: z.string().optional(),
  currency: z
    .string()
    .optional()
    .refine(val => val && Object.hasOwn(currencyList, val), {
      message: 'Invalid currency code',
    }),
});

export type ZUserUpdateRequest = z.infer<typeof zUserUpdateRequest>;
