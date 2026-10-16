import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { TemplateMeta } from '../../../../shared/types/ArticleTemplates.ts';

export type TemplateMetaQuery =
  | { scope: 'current'; format: number }
  | { scope: 'tournament' | 'group'; id: string };
export const templateKeys = {
  meta: (input?: TemplateMetaQuery) => ['article-templates', 'meta', input] as const,
};
export function useTemplateMeta(input?: TemplateMetaQuery) {
  return useQuery({
    queryKey: templateKeys.meta(input),
    queryFn: input
      ? async ({ signal }): Promise<TemplateMeta> => {
          const response = await api['creator-hub'].templates.meta.$get(
            {
              query: input.scope === 'current' ? { ...input, format: String(input.format) } : input,
            },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not prepare meta data.');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 60_000,
    // Keep the author's preparation stable while they consult another tab.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
