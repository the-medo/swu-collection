import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZDeckBranchCreateRequest } from '../../../../types/ZDeckBranch.ts';

export const useCreateDeckBranch = (teamId: string | undefined, deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckBranchCreateRequest & { deckId?: string } = {}) => {
      const targetDeckId = deckId ?? payload.deckId;
      if (!teamId || !targetDeckId) throw new Error('Team id and deck id are required');
      const json = { ...payload };
      delete json.deckId;

      const response = await api.teams[':id'].decks[':deckId'].branches.$post({
        param: { id: teamId, deckId: targetDeckId },
        json,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to create branch');
      }
      const { data } = await response.json();
      return data as { branch: { id: string }; branchDeck: { id: string; name: string } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-deck-branches', teamId] });
      toast({ title: 'Deck branch created' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while creating branch',
        description: error.message,
      });
    },
  });
};
