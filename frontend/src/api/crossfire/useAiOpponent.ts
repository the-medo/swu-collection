import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { crossfireKeys } from './queryKeys.ts';
import type { z } from 'zod';
import type { createAiGameSchema } from '../../../../shared/types/crossfire-ai-play.ts';

export function useAiOpponents(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: [...crossfireKeys.session(sessionId), 'ai-opponents'],
    enabled,
    staleTime: 15_000,
    queryFn: async ({ signal }) => {
      const r = await api.crossfire.ai.opponents.$get({}, { init: { signal } });
      if (!r.ok) throw await createApiError(r, 'Could not load AI opponents');
      return r.json();
    },
  });
}
export function useCreateAiGame(sessionId: string) {
  const client = useQueryClient();
  const attempt = useRef<{ key: string; requestId: string } | null>(null);
  return useMutation({
    mutationFn: async (input: Omit<z.infer<typeof createAiGameSchema>, 'requestId'>) => {
      const key = JSON.stringify(input);
      if (attempt.current?.key !== key) attempt.current = { key, requestId: crypto.randomUUID() };
      const r = await api.crossfire.ai.games.$post({
        json: { ...input, requestId: attempt.current.requestId },
      });
      if (!r.ok) throw await createApiError(r, 'Could not start the AI game');
      return (await r.json()).data;
    },
    onSuccess: async () => {
      attempt.current = null;
      await client.invalidateQueries({ queryKey: crossfireKeys.session(sessionId) });
    },
  });
}
