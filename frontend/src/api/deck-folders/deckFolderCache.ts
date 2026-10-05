import type { QueryClient } from '@tanstack/react-query';
import type { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import type { DeckFolder } from '../../../../types/DeckFolder.ts';
import { getDeckFolderDescendants } from '../../../../shared/lib/deckFolders.ts';
import { deckFolderKeys } from './queryKeys.ts';

export async function applyDeletedDeckFolderCaches(client: QueryClient, id: string) {
  const removed = new Set([id]);
  for (const [, folders] of client.getQueriesData<DeckFolder[]>({ queryKey: deckFolderKeys.all })) {
    if (folders?.some(folder => folder.id === id))
      getDeckFolderDescendants(folders, id).forEach(folderId => removed.add(folderId));
  }

  // Unmount the removed subtree and discard its lists before refreshing surviving lists.
  client.setQueriesData<DeckFolder[]>({ queryKey: deckFolderKeys.all }, folders =>
    folders?.filter(folder => !removed.has(folder.id)),
  );
  const removedLists = {
    queryKey: ['decks'],
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const params = query.queryKey[2] as GetDecksRequest | undefined;
      return !!params?.folderId && removed.has(params.folderId);
    },
  };
  await client.cancelQueries(removedLists);
  client.removeQueries(removedLists);
  await Promise.all([
    client.invalidateQueries({ queryKey: deckFolderKeys.all }),
    client.invalidateQueries({ queryKey: ['decks'] }),
  ]);
}
