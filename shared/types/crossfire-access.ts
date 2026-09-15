import { z } from 'zod';
export const crossfireAccessQuery = z.strictObject({
  search: z.string().trim().max(120).default(''),
});
export const crossfireAccessParams = z.strictObject({ userId: z.string().min(1).max(128) });
export const crossfireAccessChange = z.strictObject({ enabled: z.boolean() });
export type CrossfireAccessUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  enabled: boolean;
};
