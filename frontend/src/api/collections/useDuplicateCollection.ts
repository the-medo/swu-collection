import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { CollectionType } from '../../../../types/enums.ts';

export type DuplicateCollectionRequest = {
  collectionId: string;
  title: string;
  collectionType: CollectionType;
  public: boolean;
};

export const useDuplicateCollection = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, ...data }: DuplicateCollectionRequest) => {
      if (!user?.id) {
        throw new Error('User must be logged in to duplicate a collection');
      }

      const response = await api.collection[':id']['duplicate'].$post({
        param: { id: collectionId },
        json: { ...data },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to duplicate collection');
      }

      return response.json();
    },
    onSuccess: result => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: ['collections'], exact: false });

        toast({
          title: 'Collection duplicated successfully',
          description: `Created "${result.data.title}"`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to duplicate collection',
        description: error.message,
      });
    },
  });
};
