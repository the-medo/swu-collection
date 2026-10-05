import { z } from 'zod';
import { zDeckBulkDeleteRequest } from './ZDeck.ts';

export const zDeckFolderId = z.guid();
export const zDeckFolderRequest = z.object({
  name: z.string().trim().min(1, 'Enter a folder name').max(100),
  parentId: zDeckFolderId.nullable().default(null),
});
export const zDeckFolderUpdateRequest = zDeckFolderRequest.extend({
  parentId: zDeckFolderId.nullable().optional(),
});
export const zMoveDecksToFolderRequest = z.object({
  deckIds: zDeckBulkDeleteRequest.shape.deckIds,
  folderId: zDeckFolderId.nullable(),
});
export const zDeckFolderPositionRequest = z
  .object({
    targetId: zDeckFolderId.nullable(),
    placement: z.enum(['before', 'after', 'inside']),
  })
  .refine(input => input.targetId !== null || input.placement === 'inside', {
    message: 'Choose a folder when placing before or after it',
  });

export type DeckFolderRequest = z.infer<typeof zDeckFolderRequest>;
export type DeckFolderUpdateRequest = z.infer<typeof zDeckFolderUpdateRequest>;
export type MoveDecksToFolderRequest = z.infer<typeof zMoveDecksToFolderRequest>;
export type DeckFolderPositionRequest = z.infer<typeof zDeckFolderPositionRequest>;
export type DeckFolder = {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
  deckCount: number;
};
