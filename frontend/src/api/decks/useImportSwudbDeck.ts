import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { type ZDeckImportSwudbRequest } from '../../../../types/ZDeck.ts';

export const useImportSwudbDeck = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckImportSwudbRequest) => {
      if (!user?.id) {
        throw new Error('User id is required');
      }
      const response = await api.deck['import-swudb'].$post({
        json: payload,
      });

      const data = await response.json();

      if (!response.ok && 'message' in data) {
        throw new Error(data.message);
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while importing a deck',
        description: (error as Error).toString(),
      });
    },
  });
};
