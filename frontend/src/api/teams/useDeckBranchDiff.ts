import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckDiffResponse } from '../../../../types/ZDeckBranch.ts';

export const useDeckBranchDiff = (teamId: string | undefined, branchId: string | undefined) => {
  return useQuery({
    queryKey: ['team-deck-branch-diff', teamId, branchId],
    queryFn:
      teamId && branchId
        ? async () => {
            const response = await api.teams[':id']['deck-branches'][':branchId'].diff.$get({
              param: { id: teamId, branchId },
            });
            if (!response.ok) throw new Error('Failed to fetch branch diff');
            const { data } = await response.json();
            return data as DeckDiffResponse;
          }
        : skipToken,
  });
};
