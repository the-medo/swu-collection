import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export interface ImportFromBlobRequest {
  sourceTournamentId: string;
  markAsImported?: boolean;
}

export const useImportTournamentFromBlob = (tournamentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportFromBlobRequest) => {
      const response = await api.tournament[':id']['import-from-blob'].$post({
        param: { id: tournamentId },
        json: data,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to import tournament from blob');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast({ title: 'Tournament imported', description: 'Tournament data imported from blob.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Import failed', description: error.message });
    },
  });
};
