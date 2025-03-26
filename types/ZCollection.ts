import { z } from 'zod';
import { CollectionType } from './enums.ts';

export const zCollectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(3).max(255),
  description: z.string(),
  collectionType: z.nativeEnum(CollectionType).default(CollectionType.COLLECTION),
  public: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const zCollectionCreateRequest = zCollectionSchema.pick({
  title: true,
  description: true,
  collectionType: true,
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
    description: true,
    public: true,
  })
  .partial();

export const zCollectionDuplicateRequest = z.object({
  title: z.string().min(3).max(255),
  collectionType: z.nativeEnum(CollectionType).default(CollectionType.COLLECTION),
  public: z.boolean().default(false),
});

export type ZCollection = z.infer<typeof zCollectionSchema>;
export type ZCollectionCreateRequest = z.infer<typeof zCollectionCreateRequest>;
export type ZCollectionUpdateRequest = z.infer<typeof zCollectionUpdateRequest>;
export type ZCollectionDuplicateRequest = z.infer<typeof zCollectionDuplicateRequest>;
