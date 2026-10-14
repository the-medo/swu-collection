import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { readCardGalleryList, rememberCardGalleryList } from './cardGalleryListStorage.ts';

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map<string, string>();
let now = 1_700_000_000_000;
let clock: ReturnType<typeof spyOn>;
const key = (userId: string) => `swubase:card-gallery:destination:${userId}`;
beforeEach(() => {
  values.clear();
  now = 1_700_000_000_000;
  clock = spyOn(Date, 'now').mockImplementation(() => now);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (name: string) => values.get(name) ?? null,
      setItem: (name: string, value: string) => values.set(name, value),
      removeItem: (name: string) => values.delete(name),
    },
  });
});
afterEach(() => {
  clock.mockRestore();
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

test('selection expires after five minutes; reads do not extend it and writes renew it', () => {
  rememberCardGalleryList('owner', 'list');
  now += 4 * 60_000;
  expect(readCardGalleryList('owner')).toBe('list');
  now += 60_000;
  expect(readCardGalleryList('owner')).toBeUndefined();
  expect(values.has(key('owner'))).toBe(false);
  rememberCardGalleryList('owner', 'list');
  now += 4 * 60_000;
  rememberCardGalleryList('owner', 'list');
  now += 2 * 60_000;
  expect(readCardGalleryList('owner')).toBe('list');
  now += 3 * 60_000;
  expect(readCardGalleryList('owner')).toBeUndefined();
});

test('destinations are account-scoped and clearing removes the saved selection', () => {
  rememberCardGalleryList('alice', 'alice-list');
  rememberCardGalleryList('bob', 'bob-list');
  expect(readCardGalleryList(undefined)).toBeUndefined();
  expect(readCardGalleryList('alice')).toBe('alice-list');
  expect(readCardGalleryList('bob')).toBe('bob-list');
  rememberCardGalleryList('alice', undefined);
  expect(readCardGalleryList('alice')).toBeUndefined();
  expect(readCardGalleryList('bob')).toBe('bob-list');
});

test('malformed and unavailable storage never prevent gallery use', () => {
  for (const raw of [
    'invalid-json',
    'null',
    '[]',
    '{}',
    '{"id":2,"expiresAt":1800000000000}',
    '{"id":"list","expiresAt":"later"}',
  ]) {
    values.set(key('owner'), raw);
    expect(readCardGalleryList('owner')).toBeUndefined();
    expect(values.has(key('owner'))).toBe(false);
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Blocked storage');
    },
  });
  expect(readCardGalleryList('owner')).toBeUndefined();
  expect(() => rememberCardGalleryList('owner', 'list')).not.toThrow();
  expect(() => rememberCardGalleryList('owner', undefined)).not.toThrow();
});
