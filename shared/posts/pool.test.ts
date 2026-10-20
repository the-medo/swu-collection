import { expect, test } from 'bun:test';
import { poolIdFromInput } from './pool.ts';

const id = '05178e2c-c17f-4389-8bf6-13d49d9c4b5d';

test('sealed pool input accepts IDs and pool links, including development origins', () => {
  for (const input of [
    id,
    `  ${id.toUpperCase()}  `,
    `https://swubase.com/limited/pool/${id}/detail`,
    `https://steamdeck.tail73a93e.ts.net:5178/limited/pool/${id}/detail`,
    `http://localhost:5180/limited/pool/${id}/detail?tab=cards#leaders`,
    `/limited/pool/${id}`,
    `/limited/pool/${id}/detail/`,
  ])
    expect(poolIdFromInput(input)).toBe(id);
});

test('invalid input cannot become a pool reference or redirect destination', () => {
  for (const input of [
    '',
    'not-an-id',
    `https://swubase.com/decks/${id}`,
    `https://swubase.com/limited/pool/${id}/detail/extra`,
    `https://swubase.com/limited/pool/not-an-id/detail`,
    `javascript:/limited/pool/${id}`,
    `ftp://swubase.com/limited/pool/${id}`,
    `https://user:password@swubase.com/limited/pool/${id}`,
    `https://swubase.com/limited/pool/${id}/de\ntail`,
    `https://swubase.com\\limited\\pool\\${id}`,
    `https://swubase.com/limited/pool/${id}/detail?q=${'a'.repeat(2048)}`,
  ])
    expect(poolIdFromInput(input)).toBeUndefined();
});
