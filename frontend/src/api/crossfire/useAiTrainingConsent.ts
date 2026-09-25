import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
const key = (gameId: string, sessionId: string) =>
  ['crossfire', 'ai-consent', sessionId, gameId] as const;
export function useAiTrainingConsent(gameId: string, sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: key(gameId, sessionId),
    enabled,
    staleTime: 0,
    queryFn: async () => {
      const response = await api.crossfire.games[':gameId']['ai-training'].$get({
        param: { gameId },
      });
      if (!response.ok) throw await createApiError(response, 'Could not load training permission');
      return (await response.json()).data;
    },
  });
}
export function useSetAiTrainingConsent(gameId: string, sessionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (allowed: boolean) => {
      const response = await api.crossfire.games[':gameId']['ai-training'].$put({
        param: { gameId },
        json: { allowed, policy: 1 },
      });
      if (!response.ok) throw await createApiError(response, 'Could not save training permission');
      return (await response.json()).data;
    },
    onSuccess: data => {
      client.setQueryData(key(gameId, sessionId), data);
    },
  });
}
