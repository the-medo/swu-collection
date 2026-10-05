import type { QueryClient } from '@tanstack/react-query';
import type { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import type { DeckFolder, SharedDeckFolder } from '../../../../types/DeckFolder.ts';
import { getDeckFolderDescendants } from '../../../../shared/lib/deckFolders.ts';
import { deckFolderKeys } from './queryKeys.ts';

export const invalidateDeckFolderCaches = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: deckFolderKeys.all }),
    client.invalidateQueries({ queryKey: ['decks'] }),
    client.invalidateQueries({ queryKey: ['deck'] }),
    client.invalidateQueries({ queryKey: ['deck-content'] }),
    client.invalidateQueries({ queryKey: ['decks-bulk'] }),
  ]);

export async function applyDeletedDeckFolderCaches(client: QueryClient, id: string) {
  const removed = new Set([id]);
  for (const [, folders] of client.getQueriesData<DeckFolder[] | SharedDeckFolder>({
    queryKey: deckFolderKeys.all,
  })) {
    if (Array.isArray(folders) && folders.some(folder => folder.id === id))
      getDeckFolderDescendants(folders, id).forEach(folderId => removed.add(folderId));
  }

  // Unmount the removed subtree and discard its lists before refreshing surviving lists.
  client.setQueriesData<DeckFolder[] | SharedDeckFolder>(
    { queryKey: deckFolderKeys.all },
    folders =>
      Array.isArray(folders) ? folders.filter(folder => !removed.has(folder.id)) : folders,
  );
  client.removeQueries({
    queryKey: ['deck-folders', 'shared'],
    predicate: query => removed.has(query.queryKey[2] as string),
  });
  const removedLists = {
    queryKey: ['decks'],
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const params = query.queryKey[2] as GetDecksRequest | undefined;
      return !!params?.folderId && removed.has(params.folderId);
    },
  };
  await client.cancelQueries(removedLists);
  client.removeQueries(removedLists);
  await invalidateDeckFolderCaches(client);
}
