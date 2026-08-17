import { z } from 'zod';

export const zDeckVersionSaveRequest = z.object({
  changeNote: z.string().trim().max(255).optional(),
  expectedUpdatedAt: z.iso.datetime().optional(),
});

export const zDeckVersionDiffRequest = z.object({
  versionId: z.guid(),
});

export type ZDeckVersionSaveRequest = z.infer<typeof zDeckVersionSaveRequest>;
