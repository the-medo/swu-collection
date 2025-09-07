import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useExportTournamentToBlob = (tournamentId: string) => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.tournament[':id']['export-to-blob'].$post({
        param: { id: tournamentId },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error('message' in errorData ? errorData.message : 'Failed to export tournament to blob');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Export started', description: 'Tournament data exported to blob successfully.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Export failed', description: error.message });
    },
  });
};
