import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';

export function useEmailAuthConfig() {
  return useQuery({
    queryKey: ['auth', 'email-config'],
    staleTime: 60_000,
    queryFn: async () => {
      const response = await api.auth['email-config'].$get();
      if (!response.ok)
        throw await createApiError(response, 'Could not load email sign-in availability.');
      return response.json();
    },
  });
}
