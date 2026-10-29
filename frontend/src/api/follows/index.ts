import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { creatorKeys } from '@/api/creators/keys.ts';
import type {
  FollowKind,
  FollowStatus,
  FollowStatuses,
  FollowingPage,
} from '../../../../shared/types/follows.ts';

export const followKeys = {
  statuses: (viewerId?: string) => ['follows', 'status', viewerId ?? 'anonymous'] as const,
  status: (viewerId: string | undefined, kind: FollowKind, ids: string[]) =>
    [...followKeys.statuses(viewerId), kind, [...ids].sort()] as const,
  lists: (viewerId?: string) => ['follows', 'list', viewerId] as const,
  list: (viewerId: string | undefined, kind: FollowKind, page: number) =>
    [...followKeys.lists(viewerId), kind, page] as const,
  mutations: (viewerId?: string) => ['follows', 'change', viewerId] as const,
};
async function data<T>(response: Response): Promise<T> {
  if (!response.ok) throw await createApiError(response, 'Could not load follows.');
  return (await response.json()).data as T;
}

export function useFollowStatuses(kind: FollowKind, ids: string[]) {
  const session = useSession();
  return useQuery({
    queryKey: followKeys.status(session.data?.user.id, kind, ids),
    queryFn: async ({ signal }) =>
      data<FollowStatuses>(
        await api.follows[':kind'].status.$get(
          { param: { kind }, query: { ids: ids.join(',') } },
          { init: { signal } },
        ),
      ),
    enabled: ids.length > 0 && !session.isPending && (kind === 'users' || !!session.data?.user),
    staleTime: 30_000,
    gcTime: 0,
    retry: 1,
  });
}

export function useFollowing(kind: FollowKind, page: number) {
  const session = useSession();
  return useQuery({
    queryKey: followKeys.list(session.data?.user.id, kind, page),
    queryFn: async ({ signal }) =>
      data<FollowingPage>(
        await api.follows.$get({ query: { kind, page: String(page) } }, { init: { signal } }),
      ),
    enabled: !!session.data?.user,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}

export function useSetFollow(kind: FollowKind, id: string) {
  const session = useSession();
  const viewerId = session.data?.user.id;
  const client = useQueryClient();
  const mutationKey = [...followKeys.mutations(viewerId), kind, id];
  const pending = useIsMutating({ mutationKey }) > 0;
  const matchingStatuses = {
    queryKey: [...followKeys.statuses(viewerId), kind],
  };
  const update = (key: QueryKey, status: FollowStatus) =>
    client.setQueryData<FollowStatuses>(key, previous => previous && { ...previous, [id]: status });
  const mutation = useMutation({
    mutationKey,
    mutationFn: async (following: boolean) => {
      const route = api.follows[':kind'][':id'];
      const input = { param: { kind, id } };
      const options = { headers: { 'X-Requested-With': 'swubase' } };
      return data<FollowStatus>(
        following ? await route.$put(input, options) : await route.$delete(input, options),
      );
    },
    onMutate: async following => {
      await client.cancelQueries(matchingStatuses);
      const snapshots: { key: QueryKey; status: FollowStatus }[] = [];
      for (const [key, statuses] of client.getQueriesData<FollowStatuses>(matchingStatuses)) {
        const status = statuses?.[id];
        if (!status) continue;
        snapshots.push({ key, status });
        update(key, {
          ...status,
          following,
          followerCount: Math.max(
            0,
            status.followerCount + (following === status.following ? 0 : following ? 1 : -1),
          ),
        });
      }
      return snapshots;
    },
    onError: (_error, _following, snapshots) => {
      // Restore only this target; concurrent changes to other cards must survive.
      for (const snapshot of snapshots ?? []) update(snapshot.key, snapshot.status);
    },
    onSuccess: status => {
      if (kind === 'creators') {
        // Re-sort on the next visit, without moving a clicked card under the pointer.
        void client.invalidateQueries({ queryKey: creatorKeys.directories, refetchType: 'none' });
      }
      if (!status) return;
      for (const [key, statuses] of client.getQueriesData<FollowStatuses>(matchingStatuses)) {
        if (statuses?.[id]) update(key, status);
      }
    },
    onSettled: async () => {
      // A batch response must not overwrite another card's pending optimistic change.
      if (client.isMutating({ mutationKey: followKeys.mutations(viewerId) }) !== 1) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: followKeys.statuses(viewerId) }),
        client.invalidateQueries({ queryKey: followKeys.lists(viewerId) }),
        client.invalidateQueries({ queryKey: creatorKeys.followingDiscoveries }),
        client.invalidateQueries({
          queryKey: ['decks'],
          predicate: query =>
            !!(query.queryKey[2] as { following?: boolean } | undefined)?.following,
        }),
      ]);
    },
  });
  return { ...mutation, isPending: pending || mutation.isPending };
}
