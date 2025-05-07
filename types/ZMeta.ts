import { z } from 'zod';
import { zMetaSchema } from './ZTournament.ts';

export const zMetaCreateRequest = zMetaSchema.omit({
  id: true,
});

export const zMetaUpdateRequest = zMetaSchema
  .omit({
    id: true,
  })
  .partial();

export type ZMetaCreateRequest = z.infer<typeof zMetaCreateRequest>;
export type ZMetaUpdateRequest = z.infer<typeof zMetaUpdateRequest>;
