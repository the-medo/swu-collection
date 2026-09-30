import { useEffect, useRef } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import type {
  AttachmentCategory,
  AttachmentCreateInput,
  AttachmentUpdateInput,
  PreparationStatus,
  TournamentAttachment,
  TournamentAttachments,
} from '../../../../types/TournamentAttachment.ts';

const key = (userId: string | undefined, tournamentId: string) =>
  ['tournament-attachments', userId, tournamentId] as const;
const requestOptions = { headers: { 'X-Requested-With': 'swubase' } };
export function useTournamentAttachments(tournamentId: string) {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: key(userId, tournamentId),
    queryFn: userId
      ? async ({ signal }): Promise<TournamentAttachments> => {
          const response = await api['user-tournament-attachments'][':tournamentId'].$get(
            { param: { tournamentId } },
            { init: { signal } },
          );
          if (!response.ok)
            throw await createApiError(response, 'Could not load your attachments.');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 5 * 60_000,
    gcTime: 0,
    retry: false,
  });
}
export type AttachmentAction =
  | { type: 'create'; input: AttachmentCreateInput }
  | { type: 'upload'; input: { category: AttachmentCategory; title: string; file: File } }
  | { type: 'update'; id: string; input: AttachmentUpdateInput }
  | { type: 'delete'; id: string }
  | { type: 'category'; category: AttachmentCategory; status: PreparationStatus };
type Result =
  | { type: 'attachment'; attachment: TournamentAttachment }
  | { type: 'delete'; id: string }
  | { type: 'category'; category: AttachmentCategory; status: PreparationStatus };
export function useMutateTournamentAttachments(tournamentId: string) {
  const userId = useUser()?.id;
  const owner = useRef(userId);
  useEffect(() => {
    owner.current = userId;
    return () => {
      owner.current = undefined;
    };
  }, [userId]);
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...key(userId, tournamentId), 'change'],
    scope: { id: `attachments:${userId}:${tournamentId}` },
    gcTime: 0,
    onMutate: async () => {
      await client.cancelQueries({ queryKey: key(userId, tournamentId) });
    },
    mutationFn: async (action: AttachmentAction): Promise<Result> => {
      if (!userId || owner.current !== userId)
        throw new Error('Your account changed. Please try again.');
      const route = api['user-tournament-attachments'][':tournamentId'];
      const param = { tournamentId };
      if (action.type === 'category') {
        const response = await route.categories[':category'].$put(
          { param: { ...param, category: action.category }, json: { status: action.status } },
          requestOptions,
        );
        if (!response.ok) throw await createApiError(response, 'Could not update this category.');
        return { type: 'category', ...(await response.json()).data };
      }
      if (action.type === 'delete') {
        const response = await route[':id'].$delete(
          { param: { ...param, id: action.id } },
          requestOptions,
        );
        if (!response.ok) throw await createApiError(response, 'Could not delete this attachment.');
        return { type: 'delete', id: action.id };
      }
      const response =
        action.type === 'upload'
          ? await route.files.$post({ param, form: action.input }, requestOptions)
          : action.type === 'create'
            ? await route.$post({ param, json: action.input }, requestOptions)
            : await route[':id'].$patch(
                { param: { ...param, id: action.id }, json: action.input },
                requestOptions,
              );
      if (!response.ok) throw await createApiError(response, 'Could not save this attachment.');
      return { type: 'attachment', attachment: (await response.json()).data };
    },
    onSuccess: async result => {
      if (owner.current !== userId) return;
      await client.cancelQueries({ queryKey: key(userId, tournamentId) });
      if (owner.current !== userId) return;
      client.setQueryData<TournamentAttachments>(key(userId, tournamentId), current => {
        if (!current) return current;
        if (result.type === 'category')
          return {
            ...current,
            categories: { ...current.categories, [result.category]: result.status },
          };
        if (result.type === 'delete')
          return {
            ...current,
            attachments: current.attachments.filter(row => row.id !== result.id),
          };
        const exists = current.attachments.some(row => row.id === result.attachment.id);
        return {
          ...current,
          attachments: exists
            ? current.attachments.map(row =>
                row.id === result.attachment.id ? result.attachment : row,
              )
            : [...current.attachments, result.attachment],
        };
      });
    },
  });
}
