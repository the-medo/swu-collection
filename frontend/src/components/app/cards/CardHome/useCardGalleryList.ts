import { useMemo, useRef, useState } from 'react';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { useGetUserCollections } from '@/api/user/useGetUserCollections.ts';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import {
  getCollectionCardIdentificationKey,
  usePutCollectionCard,
  type CollectionCardIdentification,
} from '@/api/collections/usePutCollectionCard.ts';
import { readCardGalleryList, rememberCardGalleryList } from './cardGalleryListStorage.ts';

export function useCardGalleryList() {
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const lists = useGetUserCollections(userId);
  const [selection, setSelection] = useState<{ userId?: string; id?: string }>(() => ({
    userId,
    id: readCardGalleryList(userId),
  }));
  if (selection.userId !== userId) setSelection({ userId, id: readCardGalleryList(userId) });
  const collections = useMemo(
    () =>
      (lists.data?.collections ?? [])
        .filter(list => list.userId === userId)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [lists.data, userId],
  );
  const selected =
    selection.userId === userId ? collections.find(list => list.id === selection.id) : undefined;
  // Recheck restored destinations even when the owner/list lookup resolves after mounting.
  const contents = useGetCollectionCards(selected?.id, false, {
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const mutation = usePutCollectionCard(selected?.id, { setAmount: true });
  const mutationKey = ['collection-card', userId, selected?.id];
  const pending = useIsMutating({ mutationKey }) > 0;
  const writing = useRef(false);
  const cards = useMemo(
    () =>
      new Map(
        (contents.data?.data ?? []).map(row => [getCollectionCardIdentificationKey(row), row]),
      ),
    [contents.data],
  );

  const changeList = (id: string | undefined) => {
    if (!userId || pending) return;
    if (id) {
      // Selecting a list always checks its current contents, including a previously cached list.
      if (id === selected?.id) {
        void contents.refetch();
      } else {
        void queryClient.invalidateQueries({
          queryKey: ['collection-content', id],
          refetchType: 'none',
        });
      }
    }
    mutation.reset();
    rememberCardGalleryList(userId, id);
    setSelection({ userId, id });
  };
  const changeAmount = async (id: CollectionCardIdentification, amount: number) => {
    if (
      !selected ||
      !contents.data ||
      contents.isFetching ||
      contents.isError ||
      writing.current ||
      queryClient.isMutating({ mutationKey })
    )
      return false;
    writing.current = true;
    try {
      await mutation.mutateAsync({ id, data: { amount } });
      rememberCardGalleryList(selected.userId, selected.id);
      return true;
    } catch {
      // The shared mutation reports the error and keeps the last saved quantity for retry.
      return false;
    } finally {
      writing.current = false;
    }
  };
  return {
    userId,
    lists,
    collections,
    selected,
    contents,
    pending,
    changeList,
    editor:
      selected && contents.data && !contents.isError
        ? {
            collectionId: selected.id,
            cards,
            disabled: contents.isFetching,
            busy: pending,
            changeAmount,
          }
        : undefined,
  };
}

export type CardGalleryListState = ReturnType<typeof useCardGalleryList>;
export type CardGalleryListEditor = NonNullable<CardGalleryListState['editor']>;
