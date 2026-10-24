import { invalidateDeckFolderCaches } from '@/api/deck-folders/deckFolderCache.ts';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { hubApi } from './client.ts';
import { creatorKeys as keys } from './keys.ts';
import type { CreatorProfileInput } from '../../../../shared/creators/contracts.ts';

function useCreatorMutation<Input, Output>(
  mutationFn: (input: Input) => Promise<Output>,
  affected: (input: Input, output: Output) => readonly QueryKey[],
) {
  const query = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (output, input) =>
      Promise.all(affected(input, output).map(queryKey => query.invalidateQueries({ queryKey }))),
  });
}
export const draftSaveKeys = (creatorId: string | null, id: string) => [
  keys.draft(id),
  keys.revisions(id),
  keys.studio(creatorId),
  keys.personalCounts,
];
export function useSaveCreation() {
  return useCreatorMutation(hubApi.saveCreation, (input, result) =>
    draftSaveKeys(input.creatorId, result.id),
  );
}
export function usePublishCreation() {
  return useCreatorMutation(hubApi.publish, input => [
    keys.creation(input.id),
    keys.discoveries,
    keys.collectionsRoot,
    keys.studios,
    keys.personalCounts,
    keys.draft(input.id),
    keys.revisions(input.id),
  ]);
}
export function useSaveCreatorProfile() {
  return useCreatorMutation(
    (input: { profile: CreatorProfileInput; id?: string; revision?: number }) =>
      input.id
        ? hubApi.saveProfile({ id: input.id, revision: input.revision!, profile: input.profile })
        : hubApi.createProfile(input.profile),
    () => [
      keys.mine,
      keys.directories,
      keys.profiles,
      keys.discoveries,
      keys.creations,
      keys.studios,
    ],
  );
}
const channelKeys = (id: string) => [keys.youtube(id), keys.mine, keys.profiles];
export function useConnectYoutube() {
  return useCreatorMutation(hubApi.connect, id => channelKeys(id));
}
export function useDisconnectYoutube() {
  return useCreatorMutation(hubApi.disconnect, () => [keys.all]);
}
export function useYoutubeAutoImport() {
  return useCreatorMutation(hubApi.setYoutubeAutoImport, input => [keys.youtube(input.id)]);
}
export function useFetchYoutubeVideos() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: hubApi.fetchYoutubeVideos,
    // Failed provider calls consume the cooldown too; reload the server's timestamp.
    onSettled: (_data, _error, input) =>
      query.invalidateQueries({ queryKey: keys.youtube(input.id) }),
  });
}
export function useImportVideo() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: hubApi.importVideo,
    onSuccess: (result, input) =>
      Promise.all(
        draftSaveKeys(input.id, result.id).map(queryKey => query.invalidateQueries({ queryKey })),
      ),
    // An expired/revoked connection can be discovered while importing.
    onSettled: () => query.invalidateQueries({ queryKey: keys.all }),
  });
}
export function useSetCreatorMember() {
  return useCreatorMutation(hubApi.setMember, input => [keys.members(input.id), keys.mine]);
}

export function useOnboardCreator() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: hubApi.onboard,
    onSuccess: () => query.invalidateQueries({ queryKey: keys.all }),
    // A failed response may follow a successful transaction. Make the resulting
    // profile visible if the writer returns to the studio instead of retrying.
    onError: () =>
      Promise.all(
        [keys.mine, keys.personalCounts].map(queryKey => query.invalidateQueries({ queryKey })),
      ),
  });
}
export function useTransferArticles() {
  return useCreatorMutation(hubApi.transferArticles, () => [keys.all]);
}

export function useReloadCreationDraft() {
  const query = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: hubApi.draft,
    onSuccess: (draft, id) => {
      query.setQueryData([...keys.draft(id), user?.id], draft);
      return query.invalidateQueries({ queryKey: keys.studios });
    },
  });
}

export function useClaimYoutube() {
  return useMutation({ mutationFn: hubApi.claimYoutube });
}
export function useConfirmYoutubeClaim() {
  const query = useQueryClient();
  return useMutation({
    mutationFn: hubApi.confirmYoutubeClaim,
    onSuccess: () =>
      Promise.all([
        query.invalidateQueries({ queryKey: keys.all }),
        invalidateDeckFolderCaches(query),
      ]),
  });
}
export function useCancelYoutubeClaim() {
  return useMutation({ mutationFn: hubApi.cancelYoutubeClaim });
}
