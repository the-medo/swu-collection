import { z } from 'zod';

export const zTeamCreateRequest = z.object({
  name: z.string().min(2).max(100),
  shortcut: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Shortcut must contain only lowercase letters, numbers and hyphens'),
  description: z.string().max(500).optional(),
});

export const zTeamUpdateRequest = z.object({
  name: z.string().min(2).max(100).optional(),
  shortcut: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Shortcut must contain only lowercase letters, numbers and hyphens')
    .optional(),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private']).optional(),
});

export const zTeamJoinRequestAction = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const zTeamDeckRequest = z.object({
  deckId: z.string().uuid(),
});

export type ZTeamCreateRequest = z.infer<typeof zTeamCreateRequest>;
export type ZTeamUpdateRequest = z.infer<typeof zTeamUpdateRequest>;
export type ZTeamJoinRequestAction = z.infer<typeof zTeamJoinRequestAction>;
export type ZTeamDeckRequest = z.infer<typeof zTeamDeckRequest>;
