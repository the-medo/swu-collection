import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export interface ImportMeleeRequest {
  meleeId: string;
}

export const useImportMeleeTournament = (tournamentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportMeleeRequest) => {
      const response = await api.tournament[':id']['import-melee'].$post({
        param: { id: tournamentId },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(
          'message' in errorData
            ? errorData.message
            : 'Failed to import tournament data from Melee.gg',
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate tournament data to reload with imported info
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });

      toast({
        title: 'Tournament data imported',
        description: 'Successfully imported tournament data from Melee.gg',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error.message,
      });
    },
  });
};
