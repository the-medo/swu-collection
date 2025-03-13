import { z } from 'zod';

export const zPaginationParams = z.object({
  limit: z.coerce.number().int().positive().default(25),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof zPaginationParams>;
