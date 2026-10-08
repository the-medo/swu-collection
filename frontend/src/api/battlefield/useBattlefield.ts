import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { userHeaderKeys } from '@/api/user-header/queryKeys';
import type {
  BattlefieldDraftInput,
  BattlefieldSaveInput,
} from '../../../../shared/types/battlefield.ts';

export const battlefieldKeys = {
  editors: ['battlefields', 'editor'] as const,
  editor: (userId?: string) => ['battlefields', 'editor', userId] as const,
  profile: (userId: string) => ['battlefields', 'profile', userId] as const,
};
export function useBattlefieldEditor() {
  const user = useUser();
  return useQuery({
    queryKey: battlefieldKeys.editor(user?.id),
    staleTime: 0,
    queryFn: user
      ? async () => {
          const response = await api.battlefields.$get();
          if (!response.ok)
            throw await createApiError(response, 'Could not load your Battlefield.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}
export function usePublicBattlefield(userId: string) {
  return useQuery({
    queryKey: battlefieldKeys.profile(userId),
    staleTime: 30000,
    queryFn: async () => {
      const response = await api.user[':id'].battlefield.$get({ param: { id: userId } });
      if (!response.ok) throw await createApiError(response, 'Could not load this Battlefield.');
      return (await response.json()).data;
    },
  });
}
export function useBattlefieldActions() {
  const user = useUser();
  const client = useQueryClient();
  const refresh = async () => {
    if (!user) return;
    await Promise.all([
      client.invalidateQueries({ queryKey: battlefieldKeys.editor(user.id) }),
      client.invalidateQueries({ queryKey: battlefieldKeys.profile(user.id) }),
      client.invalidateQueries({ queryKey: userHeaderKeys.all(user.id) }),
    ]);
  };
  const headers = { 'X-Requested-With': 'swubase' };
  const create = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.battlefields.$post({ json: { name } }, { headers });
      if (!response.ok) throw await createApiError(response, 'Could not create your Battlefield.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
  });
  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.battlefields[':id'].duplicate.$post(
        { param: { id } },
        { headers },
      );
      if (!response.ok)
        throw await createApiError(response, 'Could not duplicate your Battlefield.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
  });
  const createFromDraft = useMutation({
    mutationFn: async (input: BattlefieldDraftInput) => {
      const response = await api.battlefields['from-draft'].$post({ json: input }, { headers });
      if (!response.ok) throw await createApiError(response, 'Could not save your Battlefield.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
  });
  const save = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BattlefieldSaveInput }) => {
      const response = await api.battlefields[':id'].$patch(
        { param: { id }, json: input },
        { headers },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save your Battlefield.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
  });
  const activate = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.battlefields[':id'].activate.$post({ param: { id } }, { headers });
      if (!response.ok)
        throw await createApiError(response, 'Could not update your profile Battlefield.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
  });
  return { create, createFromDraft, duplicate, save, activate };
}
