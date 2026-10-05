import { afterEach, expect, test } from 'bun:test';
import {
  openDeckFoldersKey,
  readOpenDeckFolders,
  readUnfiledOpen,
  writeOpenDeckFolders,
  writeUnfiledOpen,
} from './openFoldersStorage.ts';

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
function storage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  return values;
}
test('expanded folders survive reload and are scoped to the account', () => {
  storage();
  writeOpenDeckFolders('alice', new Set(['root', 'child']));
  writeOpenDeckFolders('bob', new Set(['other']));
  expect(readOpenDeckFolders('alice')).toEqual(new Set(['root', 'child']));
  expect(readOpenDeckFolders('bob')).toEqual(new Set(['other']));
});
test('Unfiled starts open and persists collapse separately for each account', () => {
  storage();
  expect(readUnfiledOpen('alice')).toBe(true);
  writeUnfiledOpen('alice', false);
  expect(readUnfiledOpen('alice')).toBe(false);
  expect(readUnfiledOpen('bob')).toBe(true);
  writeOpenDeckFolders('alice', new Set());
  expect(readUnfiledOpen('alice')).toBe(false);
  writeUnfiledOpen('alice', true);
  expect(readUnfiledOpen('alice')).toBe(true);
});
test('malformed and unavailable storage do not prevent navigation', () => {
  const values = storage();
  values.set(openDeckFoldersKey('alice'), 'broken JSON');
  expect(readOpenDeckFolders('alice').size).toBe(0);
  values.set(openDeckFoldersKey('alice'), '["folder",null,7,"folder"]');
  expect(readOpenDeckFolders('alice')).toEqual(new Set(['folder']));
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new Error('Unavailable');
    },
  });
  expect(readOpenDeckFolders('alice').size).toBe(0);
  expect(() => writeOpenDeckFolders('alice', new Set(['folder']))).not.toThrow();
  expect(readUnfiledOpen('alice')).toBe(true);
  expect(() => writeUnfiledOpen('alice', false)).not.toThrow();
});
