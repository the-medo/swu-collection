import { z } from 'zod';

export const collectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  wantlist: z.boolean().optional().default(false),
  public: z.boolean().default(false),
  // createdAt: z.string().datetime(),
  // updatedAt: z.string().datetime(),
});

export type Collection = z.infer<typeof collectionSchema>;
