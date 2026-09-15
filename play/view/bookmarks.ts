import { reportDescriptionSchema } from './chat.ts';
import { z } from 'zod';
export const bookmarkLabelSchema = z.string().trim().max(120);
export const bookmarkSchema = z.strictObject({
  id: z.uuid(),
  lobbyId: z.uuid(),
  position: z.string().regex(/^[a-f0-9]{32}$/),
  branch: z.string().regex(/^[a-f0-9]{32}$/),
  label: bookmarkLabelSchema,
  createdAt: z.iso.datetime(),
  available: z.boolean(),
  canPractice: z.boolean().optional(),
});
export type Bookmark = z.infer<typeof bookmarkSchema>;
export const bookmarkMessageSchema = z.strictObject({
  type: z.literal('bookmark'),
  report: reportDescriptionSchema.optional(),
  id: z.uuid(),
  label: bookmarkLabelSchema,
  epoch: z.string().regex(/^[a-f0-9]{32}$/),
  revision: z.number().int().nonnegative(),
});
