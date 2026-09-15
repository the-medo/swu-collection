import { z } from 'zod';
const position = z.string().regex(/^[a-f0-9]{32}$/);
export const replaySeekSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('start') }),
  z.strictObject({ kind: z.literal('end') }),
  z.strictObject({ kind: z.literal('refresh') }),
  z.strictObject({ kind: z.literal('position'), position, branch: position.optional() }),
  z.strictObject({ kind: z.literal('branch'), branch: position }),
  z.strictObject({
    kind: z.literal('step'),
    offset: z.union([z.literal(-5), z.literal(-1), z.literal(1), z.literal(5)]),
  }),
  z.strictObject({ kind: z.literal('action'), direction: z.union([z.literal(-1), z.literal(1)]) }),
  z.strictObject({ kind: z.literal('fraction'), value: z.number().min(0).max(1) }),
]);
export type ReplaySeek = z.infer<typeof replaySeekSchema>;
export const replayPositionSchema = z.strictObject({
  position,
  branch: position,
  steps: z.strictObject({
    previous: position.nullable(),
    next: position.nullable(),
    backFive: position.nullable(),
    forwardFive: position.nullable(),
  }),
  branches: z.array(z.strictObject({ id: position, label: z.string().max(80) })).max(10_000),
  progress: z.number().min(0).max(1),
  atStart: z.boolean(),
  atEnd: z.boolean(),
  live: z.boolean(),
});
export type ReplayPosition = z.infer<typeof replayPositionSchema>;
