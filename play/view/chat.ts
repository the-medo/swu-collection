import { z } from 'zod';
export const chatTextSchema = z.string().trim().min(1).max(1000);
export const chatMessageSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  seat: z.enum(['p1', 'p2']),
  text: chatTextSchema,
  createdAt: z.iso.datetime(),
  afterEvent: z.number().int().nonnegative().nullable().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const chatSendSchema = z.strictObject({
  type: z.literal('chat-send'),
  id: z.uuid(),
  text: chatTextSchema,
});
export const reportDescriptionSchema = z.string().trim().min(10).max(3000);
export type ProblemReport = {
  id: string;
  lobbyId: string;
  position: string;
  branch: string;
  label: string;
  description: string;
  status: 'open' | 'resolved';
  createdAt: string;
  available: boolean;
};
