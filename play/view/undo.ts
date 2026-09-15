import { z } from 'zod';
export const undoPendingSchema = z.strictObject({
  id: z.uuid(),
  requester: z.enum(['p1', 'p2']),
  expiresAt: z.iso.datetime(),
});
export type UndoPending = z.infer<typeof undoPendingSchema>;
export const undoMessageSchema = z.discriminatedUnion('action', [
  z.strictObject({
    type: z.literal('undo'),
    action: z.literal('request'),
    id: z.uuid(),
    epoch: z.string().regex(/^[a-f0-9]{32}$/),
    revision: z.number().int().nonnegative(),
  }),
  z.strictObject({
    type: z.literal('undo'),
    action: z.enum(['approve', 'decline', 'cancel']),
    id: z.uuid(),
  }),
]);
