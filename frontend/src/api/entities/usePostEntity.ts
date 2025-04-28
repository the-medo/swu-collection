import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export interface EntityResourceCreateRequest {
  entityType: string;
  entityId: string;
  resourceType: string;
  resourceUrl: string;
  title?: string;
  description?: string;
}

export interface EntityResource extends EntityResourceCreateRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const usePostEntity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EntityResourceCreateRequest) => {
      const response = await api.entities.$post({
        json: data,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create entity resource: ${errorText}`);
      }

      return response.json() as Promise<{ data: EntityResource }>;
    },
    onSuccess: result => {
      // Invalidate the query for the entity's resources
      queryClient.invalidateQueries({
        queryKey: ['entity-resources', result.data.entityId],
      });

      toast({
        title: 'Resource added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating resource',
        description: error.message,
      });
    },
  });
};
