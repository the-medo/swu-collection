import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useUploadTeamLogo = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!teamId) {
        throw new Error('Team id is required');
      }
      const response = await api.teams[':id'].logo.$post({
        param: { id: teamId },
        form: { logo: file },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to upload logo');
      }
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['user-setup'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while uploading logo',
        description: error.message,
      });
    },
  });
};
