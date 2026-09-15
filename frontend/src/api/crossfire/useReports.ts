import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
export function useReport(sessionId: string, reportId: string) {
  return useQuery({
    queryKey: ['crossfire-report', sessionId, reportId],
    gcTime: 0,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.reports[':reportId'].$get(
        { param: { reportId } },
        { init: { signal } },
      );
      if (!response.ok)
        throw await createApiError(response, 'This report is unavailable to your account');
      return (await response.json()).data;
    },
  });
}
export const reportsKey = (sessionId: string) => ['crossfire-reports', sessionId];
export function useReports(sessionId: string) {
  return useQuery({
    queryKey: reportsKey(sessionId),
    gcTime: 0,
    staleTime: 10_000,
    queryFn: async ({ signal }) => {
      const response = await api.crossfire.reports.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load reports');
      return (await response.json()).data;
    },
  });
}
export function useResolveReport(sessionId: string) {
  const query = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.crossfire.reports[':reportId'].$patch({ param: { reportId: id } });
      if (!response.ok) throw await createApiError(response, 'Could not resolve report');
    },
    onSuccess: () => query.invalidateQueries({ queryKey: reportsKey(sessionId) }),
  });
}
