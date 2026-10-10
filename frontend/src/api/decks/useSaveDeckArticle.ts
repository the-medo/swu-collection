import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { invalidateDeckDiscussion } from './discussionCache.ts';
import type { PostDocument } from '../../../../shared/posts/content.ts';

export function useSaveDeckArticle(deckId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (json: { content: PostDocument; revision: number | null }) => {
      const response = await api.deck[':id'].article.$put({ param: { id: deckId }, json });
      if (!response.ok) throw await createApiError(response, 'Could not save this guide.');
      return (await response.json()).data;
    },
    onSuccess: () => invalidateDeckDiscussion(client, deckId, true),
  });
}
