import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { hubApi } from './client.ts';
import { creatorKeys } from './keys.ts';

export function useReportCreation() {
  const query = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: hubApi.reportCreation,
    onSuccess: async (_, input) => {
      query.setQueryData([...creatorKeys.reportStatus(input.id), user?.id], { reported: true });
      await query.invalidateQueries({ queryKey: creatorKeys.reports });
    },
  });
}
export function useReviewCreationReport() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: hubApi.reviewReport,
    onSuccess: () => query.invalidateQueries({ queryKey: creatorKeys.all }),
    onError: () => query.invalidateQueries({ queryKey: creatorKeys.reports }),
  });
}
