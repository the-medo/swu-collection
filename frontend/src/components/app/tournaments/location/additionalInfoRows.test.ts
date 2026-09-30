import { expect, test } from 'bun:test';
import { infoToRows, rowsToInfo } from './additionalInfoRows.ts';

test('editor preserves arbitrary JSON types, numeric-looking text, nested links and null', () => {
  const info = {
    city: 'Paris',
    postalCode: '01234',
    enabled: true,
    count: 12,
    empty: null,
    links: [{ label: 'Melee', url: 'https://melee.gg' }],
    custom_data: { nested_key: 'value' },
  };
  expect(rowsToInfo(infoToRows(info))).toEqual(info);
});
test('editor rejects duplicate/unsafe keys, malformed JSON and oversized data', () => {
  const row = { id: '1', key: 'city', value: 'Paris', mode: 'text' as const };
  expect(() => rowsToInfo([row, { ...row, id: '2', key: ' city ' }])).toThrow('Duplicate');
  expect(() => rowsToInfo([{ ...row, key: '' }])).toThrow('key');
  expect(() => rowsToInfo([{ ...row, key: '__proto__' }])).toThrow();
  expect(() => rowsToInfo([{ ...row, value: '{', mode: 'json' }])).toThrow('Invalid JSON');
  expect(() => rowsToInfo([{ ...row, value: 'a'.repeat(33000) }])).toThrow('32 KB');
});
