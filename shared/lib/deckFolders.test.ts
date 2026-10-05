import { describe, expect, test } from 'bun:test';
import {
  getDeckFolderDescendants,
  getDeckFolderOptions,
  getDeckFolderPath,
} from './deckFolders.ts';
import {
  zDeckFolderRequest,
  zDeckFolderPositionRequest,
  zMoveDecksToFolderRequest,
} from '../../types/DeckFolder.ts';

const folders = [
  { id: 'root', parentId: null, name: 'Tournament prep' },
  { id: 'child', parentId: 'root', name: 'Aggro' },
  { id: 'leaf', parentId: 'child', name: 'Sabine' },
  { id: 'other', parentId: null, name: 'Casual' },
];

describe('nested deck folders', () => {
  test('descendants include the full subtree but not unrelated folders', () => {
    expect(getDeckFolderDescendants(folders, 'root')).toEqual(new Set(['root', 'child', 'leaf']));
    expect(getDeckFolderPath(folders, 'leaf').map(folder => folder.id)).toEqual([
      'root',
      'child',
      'leaf',
    ]);
    expect(getDeckFolderOptions(folders).find(option => option.id === 'leaf')?.label).toBe(
      'Tournament prep / Aggro / Sabine',
    );
  });
  test('malformed cycles cannot trap hierarchy traversal', () => {
    const cycle = [
      { id: 'a', parentId: 'b', name: 'A' },
      { id: 'b', parentId: 'a', name: 'B' },
    ];
    expect(getDeckFolderDescendants(cycle, 'a').size).toBe(2);
    expect(getDeckFolderPath(cycle, 'a')).toHaveLength(2);
  });
  test('folder names are trimmed and blank names and oversized batches are rejected', () => {
    expect(zDeckFolderRequest.parse({ name: '  Prep  ' })).toEqual({
      name: 'Prep',
      parentId: null,
    });
    expect(zDeckFolderRequest.safeParse({ name: '   ' }).success).toBe(false);
    expect(zDeckFolderRequest.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
    const id = crypto.randomUUID();
    expect(zMoveDecksToFolderRequest.safeParse({ deckIds: [id, id], folderId: null }).success).toBe(
      false,
    );
    expect(
      zMoveDecksToFolderRequest.safeParse({
        deckIds: Array.from({ length: 101 }, () => crypto.randomUUID()),
        folderId: null,
      }).success,
    ).toBe(false);
    expect(zMoveDecksToFolderRequest.safeParse({ deckIds: [id], folderId: null }).success).toBe(
      true,
    );
    expect(
      zDeckFolderPositionRequest.safeParse({ targetId: null, placement: 'before' }).success,
    ).toBe(false);
    expect(
      zDeckFolderPositionRequest.safeParse({ targetId: null, placement: 'inside' }).success,
    ).toBe(true);
  });
});
