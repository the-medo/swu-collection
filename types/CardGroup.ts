import { z } from 'zod';

export const maxCardGroupPosition = 2_147_483_647;
const cardGroupPosition = z
  .number({ error: 'Enter a position.' })
  .int('Position must be a whole number.')
  .min(0, 'Position must be zero or greater.')
  .max(maxCardGroupPosition, `Position must be ${maxCardGroupPosition} or less.`);

export const cardGroupInput = z
  .object({
    title: z.string().trim().min(1, 'Give this group a title.').max(150),
    description: z.string().trim().max(500),
    variantIds: z
      .array(z.string().trim().min(1).max(255))
      .min(1, 'Add at least one card version.')
      .max(500)
      .refine(ids => new Set(ids).size === ids.length, 'Each card version may appear only once.'),
    published: z.boolean(),
    sortOrder: cardGroupPosition,
  })
  .strict();

export type CardGroupInput = z.infer<typeof cardGroupInput>;
export type CardGroup = CardGroupInput & { id: string; updatedAt: string };

const cardGroupCursor = z
  .object({
    id: z.uuid(),
    sortOrder: cardGroupPosition,
    updatedAt: z.iso.datetime().refine(value => Number(value.slice(0, 4)) >= 1),
  })
  .strict();

export const cardGroupFeedQuery = z.object({
  cursor: z
    .string()
    .max(200)
    .transform((value, ctx) => {
      try {
        return cardGroupCursor.parse(JSON.parse(value));
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid card group cursor.' });
        return z.NEVER;
      }
    })
    .optional(),
});
export type CardGroupCursor = z.infer<typeof cardGroupCursor>;
export type CardGroupPage = { data: CardGroup[]; nextCursor: string | null };
