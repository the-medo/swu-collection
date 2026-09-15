import type { CrossfireGameArtwork } from './crossfire-activity.ts';
import { z } from 'zod';

export const crossfirePolicySchema = z
  .strictObject({
    allowSpectators: z.boolean(),
    handsToPlayers: z.boolean(),
    handsToSpectators: z.boolean(),
  })
  .refine(p => p.allowSpectators || !p.handsToSpectators, 'Spectator hands require spectators');
export type CrossfirePolicy = z.infer<typeof crossfirePolicySchema>;
export const crossfireLobbyParams = z.strictObject({ lobbyId: z.uuid() });
export const crossfireCreateBody = z.strictObject({
  deckId: z.uuid(),
  policy: crossfirePolicySchema,
  bestOf: z.union([z.literal(1), z.literal(3)]).default(1),
  showLeader: z.boolean().default(true),
  recipientId: z.string().min(1).max(128).optional(),
});
export const crossfireJoinBody = z.strictObject({
  deckId: z.uuid(),
  acceptedPolicy: crossfirePolicySchema,
  acceptedBestOf: z.union([z.literal(1), z.literal(3)]).default(1),
});
export const crossfireTicketBody = z.strictObject({
  role: z.enum(['player', 'spectator']),
  purpose: z.enum(['live', 'replay']).default('live'),
});
export type CrossfireExit = { status: 'pending' | 'forfeit' | 'abandoned'; seat: 'p1' | 'p2' };
export type CrossfireLobby = {
  exit?: CrossfireExit | null;
  compatible?: boolean;
  practice?: boolean;
  bestOf?: 1 | 3;
  id: string;
  status: 'waiting' | 'started' | 'cancelled' | 'expired';
  expiresAt?: string;
  showLeader?: boolean;
  host?: { name: string; leaderId?: string; baseId?: string };
  gameId: string | null;
  policy: CrossfirePolicy;
  seats: number;
  mySeat: 'p1' | 'p2' | null;
};

export type CrossfireInvitation = {
  lobbyId: string;
  direction: 'incoming' | 'outgoing';
  player: { id: string; name: string };
  expiresAt: string;
  leaderId?: string;
  baseId?: string;
};
export type CrossfireTeammate = { id: string; name: string; image: string | null };

export const crossfireDeckParams = z.strictObject({ deckId: z.uuid() });
export type CrossfireDeckIssue = {
  code:
    | 'invalid-input'
    | 'unsupported-format'
    | 'leader-count'
    | 'missing-card'
    | 'unknown-card'
    | 'wrong-role'
    | 'unsupported-card'
    | 'deck-size';
  cardId?: string;
  zone?: string;
};
export type CrossfireDeckReadiness = { ready: boolean; issues: CrossfireDeckIssue[] };

export const crossfireHistoryQuery = z.strictObject({
  status: z.literal('running').optional(),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .max(256)
    .optional(),
});
export type CrossfireHistoryGame = CrossfireGameArtwork & {
  practice?: boolean;
  lobbyId: string;
  gameId: string;
  status: 'running' | 'ended' | 'finalized' | 'abandoned';
  exit?: CrossfireExit | null;
  compatible?: boolean;
  bestOf?: 1 | 3;
  mySeat: 'p1' | 'p2';
  opponent: string;
  round: number | null;
  result: { winner: string | null; reason: string } | null;
  startedAt: string;
  endedAt: string | null;
};

/** Invitation sockets carry invalidations only; HTTP remains the metadata authority. */
export const crossfireInvitationEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ v: z.literal(1), type: z.literal('crossfire.connected') }),
  z.strictObject({ v: z.literal(1), type: z.literal('crossfire.invitation'), lobbyId: z.uuid() }),
  z.strictObject({ v: z.literal(1), type: z.literal('crossfire.game'), lobbyId: z.uuid() }),
  z.strictObject({ v: z.literal(1), type: z.literal('pong') }),
]);
export type CrossfireInvitationEvent = z.infer<typeof crossfireInvitationEventSchema>;
