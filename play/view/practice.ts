import { z } from 'zod';
export const practiceRequestSchema = z.strictObject({
  id: z.uuid(),
  lobbyId: z.uuid(),
  position: z.string().regex(/^[a-f0-9]{32}$/),
  branch: z.string().regex(/^[a-f0-9]{32}$/),
  label: z.string().max(120),
  mine: z.boolean(),
  status: z.enum(['pending', 'accepted']),
  expiresAt: z.iso.datetime(),
  createdLobbyId: z.uuid().nullable(),
});
export type PracticeRequest = z.infer<typeof practiceRequestSchema>;
