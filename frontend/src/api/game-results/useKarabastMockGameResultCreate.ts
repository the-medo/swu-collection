import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useKarabastMockGameResultCreate = () => {
  return useMutation({
    mutationFn: async (json: { deckId: string }) => {
      const res = await api.integration.karabast.mock.$post({ json });
      if (!res.ok) {
        throw new Error('Failed to create mock game result');
      }
      return res.json();
    },
  });
};
