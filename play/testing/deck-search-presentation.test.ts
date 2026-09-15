import { expect, test } from 'bun:test';
import { deckIdFromSearch } from '../../frontend/src/components/app/crossfire/presentation.ts';

const id = '0175249b-5886-4c7f-a2d8-0be2e0aa50a7';
const origin = 'http://localhost:5174';
test('deck search accepts official/current-origin links and raw IDs without using remote URLs', () => {
  for (const input of [
    id,
    ` https://swubase.com/decks/${id} `,
    `https://www.swubase.com/decks/${id}/?ref=shared`,
    `${origin}/decks/${id}`,
  ])
    expect(deckIdFromSearch(input, origin)).toBe(id);
  for (const input of [
    'Sabine',
    'https://swubase.com/decks/not-a-deck',
    `https://unrelated.test/decks/${id}`,
    `https://swubase.com.unrelated.test/decks/${id}`,
    `ftp://swubase.com/decks/${id}`,
    `https://swubase.com/crossfire/${id}`,
  ])
    expect(deckIdFromSearch(input, origin)).toBeUndefined();
});
