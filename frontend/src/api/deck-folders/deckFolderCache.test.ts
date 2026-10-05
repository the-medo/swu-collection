import { expect, test } from 'bun:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { applyDeletedDeckFolderCaches } from './deckFolderCache.ts';
import { deckFolderKeys } from './queryKeys.ts';
import type { DeckFolder } from '../../../../types/DeckFolder.ts';

test('removing a folder discards subtree lists and refreshes Unfiled while preserving other accounts', async () => {
  const client = new QueryClient();
  const folders = [
    { id: 'root', parentId: null, name: 'Root', deckCount: 0, position: 0 },
    { id: 'child', parentId: 'root', name: 'Child', deckCount: 1, position: 0 },
    { id: 'kept', parentId: null, name: 'Kept', deckCount: 1, position: 1 },
  ];
  const foreignFolders = [
    { id: 'foreign', parentId: null, name: 'Foreign', deckCount: 1, position: 0 },
  ];
  client.setQueryData(deckFolderKeys.user('owner'), folders);
  client.setQueryData(deckFolderKeys.user('foreign'), foreignFolders);
  const listKey = (folderId: string) => ['decks', 'all', { userId: 'owner', folderId }];
  const refetched: string[] = [];
  const unsubscribe: (() => void)[] = [];
  for (const id of ['root', 'child', 'kept', 'unfiled']) {
    client.setQueryData(listKey(id), { pages: [], pageParams: [] });
    const observer = new QueryObserver(client, {
      queryKey: listKey(id),
      staleTime: Infinity,
      queryFn: async () => {
        refetched.push(id);
        return { pages: [], pageParams: [] };
      },
    });
    unsubscribe.push(observer.subscribe(() => {}));
  }

  try {
    await applyDeletedDeckFolderCaches(client, 'root');

    expect(client.getQueryData<DeckFolder[]>(deckFolderKeys.user('owner'))).toEqual([folders[2]]);
    expect(client.getQueryData<DeckFolder[]>(deckFolderKeys.user('foreign'))).toEqual(
      foreignFolders,
    );
    expect(client.getQueryData(listKey('root'))).toBeUndefined();
    expect(client.getQueryData(listKey('child'))).toBeUndefined();
    expect(refetched.sort()).toEqual(['kept', 'unfiled']);
  } finally {
    unsubscribe.forEach(stop => stop());
    client.clear();
  }
});
