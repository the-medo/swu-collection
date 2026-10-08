import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { useUser } from '@/hooks/useUser';
import {
  battlefieldShowcaseDefaultFilters,
  type BattlefieldPresetInput,
  type BattlefieldPresetSaveInput,
  type BattlefieldShowcaseFilters,
} from '../../../../shared/types/battlefield.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus';

export const battlefieldPresetKeys = {
  all: ['battlefield-presets'] as const,
  showcase: (page: number, filters: BattlefieldShowcaseFilters, userId?: string) =>
    ['battlefield-presets', 'showcase', page, filters, userId] as const,
  detail: (id?: string) => ['battlefield-presets', 'detail', id] as const,
};
export function useBattlefieldShowcase(
  page: number,
  filters: BattlefieldShowcaseFilters = battlefieldShowcaseDefaultFilters,
) {
  const user = useUser();
  const effectiveFilters = { ...filters, withinCredits: filters.withinCredits && !!user };
  return useQuery({
    queryKey: battlefieldPresetKeys.showcase(page, effectiveFilters, user?.id),
    staleTime: 30000,
    queryFn: async () => {
      const response = await api['battlefield-presets'].$get({
        query: {
          page: String(page),
          search: effectiveFilters.search,
          faction: effectiveFilters.faction,
          withinCredits: String(effectiveFilters.withinCredits),
          sort: effectiveFilters.sort,
        },
      });
      if (!response.ok)
        throw await createApiError(response, 'Could not load the Battlefield showcase.');
      return (await response.json()).data;
    },
  });
}
export function useBattlefieldPreset(id?: string) {
  return useQuery({
    queryKey: battlefieldPresetKeys.detail(id),
    staleTime: 30000,
    retry: (failureCount, error) => (error as ErrorWithStatus).status !== 404 && failureCount < 3,
    queryFn: id
      ? async () => {
          const response = await api['battlefield-presets'][':id'].$get({ param: { id } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load this Battlefield preset.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}
export function useSaveBattlefieldPreset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: BattlefieldPresetInput) => {
      const response = await api['battlefield-presets'].$post(
        { json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok)
        throw await createApiError(response, 'Could not save this Battlefield preset.');
      return (await response.json()).data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: battlefieldPresetKeys.all }),
  });
}
export function useUpdateBattlefieldPreset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BattlefieldPresetSaveInput }) => {
      const response = await api['battlefield-presets'][':id'].$patch(
        { param: { id }, json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok)
        throw await createApiError(response, 'Could not update this Battlefield preset.');
      return (await response.json()).data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: battlefieldPresetKeys.all }),
  });
}
export function useDeleteBattlefieldPreset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api['battlefield-presets'][':id'].$delete(
        { param: { id } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok)
        throw await createApiError(response, 'Could not delete this Battlefield preset.');
      return (await response.json()).data;
    },
    onSettled: () => client.invalidateQueries({ queryKey: battlefieldPresetKeys.all }),
  });
}
