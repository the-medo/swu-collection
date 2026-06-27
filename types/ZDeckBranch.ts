import { z } from 'zod';
import type { Deck } from './Deck.ts';
import type { User } from './User.ts';

export const deckBranchStatus = ['open', 'merged', 'closed'] as const;
export const deckChangeRequestStatus = ['open', 'merged', 'closed'] as const;
export const deckChangeRequestEventType = [
  'submitted',
  'reopened',
  'closed',
  'merged',
  'commented',
] as const;

export const zDeckBranchStatus = z.enum(deckBranchStatus);
export const zDeckChangeRequestStatus = z.enum(deckChangeRequestStatus);
export const zDeckChangeRequestEventType = z.enum(deckChangeRequestEventType);

export const zDeckBranchCreateRequest = z.object({
  name: z.string().min(3).max(255).optional(),
});

export const zDeckChangeRequestCreateRequest = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(1000).optional().default(''),
});

export const zDeckFieldConflictResolution = z.object({
  type: z.literal('field'),
  field: z.string(),
  value: z.unknown(),
});

export const zDeckCardConflictResolution = z.object({
  type: z.literal('card'),
  key: z.string(),
  value: z
    .object({
      cardId: z.string(),
      board: z.number().int().min(1).max(3),
      quantity: z.number().int().min(0),
    })
    .nullable(),
});

export const zDeckChangeRequestMergeRequest = z.object({
  resolutions: z
    .array(z.discriminatedUnion('type', [zDeckFieldConflictResolution, zDeckCardConflictResolution]))
    .optional()
    .default([]),
  mergeDeckFields: z
    .object({
      name: z.boolean().optional().default(false),
      description: z.boolean().optional().default(false),
    })
    .optional()
    .default({ name: false, description: false }),
});

export const zDeckChangeRequestCommentRequest = z.object({
  changeKey: z.string().max(160).optional().default(''),
  body: z.string().trim().min(1).max(1000),
});

export type ZDeckBranchStatus = z.infer<typeof zDeckBranchStatus>;
export type ZDeckChangeRequestStatus = z.infer<typeof zDeckChangeRequestStatus>;
export type ZDeckChangeRequestEventType = z.infer<typeof zDeckChangeRequestEventType>;
export type ZDeckBranchCreateRequest = z.infer<typeof zDeckBranchCreateRequest>;
export type ZDeckChangeRequestCreateRequest = z.infer<typeof zDeckChangeRequestCreateRequest>;
export type ZDeckChangeRequestMergeRequest = z.infer<typeof zDeckChangeRequestMergeRequest>;
export type ZDeckChangeRequestCommentRequest = z.infer<typeof zDeckChangeRequestCommentRequest>;

export type DeckBranchSummary = {
  id: string;
  teamId: string;
  baseDeckId: string;
  branchDeckId: string;
  creatorUserId: string;
  status: ZDeckBranchStatus;
  createdAt: string;
  updatedAt: string;
};

export type DeckChangeRequestSummary = {
  id: string;
  teamId: string;
  branchId: string;
  baseDeckId: string;
  branchDeckId: string;
  authorUserId: string;
  title: string;
  description: string;
  status: ZDeckChangeRequestStatus;
  mergedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
};

export type DeckFieldChange = {
  type: 'field';
  field: string;
  before: unknown;
  after: unknown;
};

export type DeckCardChange = {
  type: 'card';
  key: string;
  cardId: string;
  board: number;
  before: { quantity: number } | null;
  after: { quantity: number } | null;
  changeType: 'added' | 'removed' | 'changed';
};

export type DeckDiffSummary = {
  fields: DeckFieldChange[];
  cards: DeckCardChange[];
  summary: {
    fieldsChanged: number;
    cardsAdded: number;
    cardsRemoved: number;
    cardsChanged: number;
  };
};

export type DeckDiffResponse = {
  branch: DeckBranchSummary;
  snapshots: {
    current: DeckReviewSnapshot;
    branch: DeckReviewSnapshot;
  };
  proposedDiff: DeckDiffSummary;
  ownerDiff: DeckDiffSummary;
  reviewComments: DeckReviewComment[];
  conflicts: Array<
    | {
        type: 'field';
        field: string;
        base: unknown;
        current: unknown;
        proposed: unknown;
      }
    | {
        type: 'card';
        key: string;
        cardId: string;
        board: number;
        base: DeckCardChange['before'];
        current: DeckCardChange['before'];
        proposed: DeckCardChange['after'];
      }
  >;
};

export type DeckReviewSnapshot = {
  deck: Pick<
    Deck,
    | 'name'
    | 'description'
    | 'format'
    | 'public'
    | 'leaderCardId1'
    | 'leaderCardId2'
    | 'baseCardId'
  >;
  cards: Array<{
    cardId: string;
    board: number;
    quantity: number;
  }>;
};

export type DeckReviewComment = {
  id: string;
  changeKey: string;
  body: string;
  createdAt: string;
  author: User;
};

export type DeckChangeRequestListItem = {
  changeRequest: DeckChangeRequestSummary;
  branch: DeckBranchSummary;
  branchDeck: Deck;
  baseDeck: Deck | null;
  author: User;
};

export type DeckOpenBranchListItem = {
  branch: DeckBranchSummary;
  branchDeck: Deck;
  creator: User;
  team: {
    id: string;
    name: string;
    shortcut: string | null;
  };
  changeRequest: DeckChangeRequestSummary | null;
};
