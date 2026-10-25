import { z } from 'zod';
export const chatTextSchema = z.string().trim().min(1).max(1000);
export const chatMessageSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  seat: z.enum(['p1', 'p2']).nullable(),
  text: chatTextSchema,
  createdAt: z.iso.datetime(),
  afterEvent: z.number().int().nonnegative().nullable().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
/** Notices cannot evict player messages from the browser or reconnect history. */
export function retainChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const sorted = [...messages].sort((a, b) => a.sequence - b.sequence);
  return [
    ...sorted.filter(message => message.seat !== null).slice(-100),
    ...sorted.filter(message => message.seat === null).slice(-20),
  ].sort((a, b) => a.sequence - b.sequence);
}

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
