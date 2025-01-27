import { z } from 'zod';

export const zCollectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(3).max(255),
  wantlist: z.boolean().default(false),
  public: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const zCollectionCreateRequest = zCollectionSchema.pick({
  title: true,
  wantlist: true,
  public: true,
});
// .partial({
//   wantlist: true,
//   public: true,
// });

export const zCollectionUpdateRequest = zCollectionSchema
  .pick({
    //id: true, //should be part of api route
    title: true,
    public: true,
  })
  .partial();

export type ZCollection = z.infer<typeof zCollectionSchema>;
export type ZCollectionCreateRequest = z.infer<typeof zCollectionCreateRequest>;
export type ZCollectionUpdateRequest = z.infer<typeof zCollectionUpdateRequest>;
