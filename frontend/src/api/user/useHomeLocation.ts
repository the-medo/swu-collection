import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import {
  homeLocationSchema,
  type HomeLocationInput,
} from '../../../../shared/lib/userHomeLocation.ts';

const key = (userId: string | undefined) => ['user-home-location', userId] as const;

export function useHomeLocation() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: key(userId),
    queryFn: userId
      ? async ({ signal }) => {
          const response = await api['user-settings']['home-location'].$get(
            {},
            { init: { signal } },
          );
          if (!response.ok)
            throw await createApiError(response, 'Could not load your home location.');
          return homeLocationSchema.nullable().parse((await response.json()).data);
        }
      : skipToken,
    // Private data stays in memory only and is discarded when the account/view changes.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useSaveHomeLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ location }: { userId: string; location: HomeLocationInput | null }) => {
      const response = await api['user-settings']['home-location'].$post({ json: { location } });
      if (!response.ok) throw await createApiError(response, 'Could not save your home location.');
      return homeLocationSchema.nullable().parse((await response.json()).data);
    },
    gcTime: 0,
    onSuccess: async (data, { userId }) => {
      await queryClient.cancelQueries({ queryKey: key(userId) });
      queryClient.setQueryData(key(userId), data);
      await queryClient.invalidateQueries({ queryKey: key(userId) });
    },
  });
}
