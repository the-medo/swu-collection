import { describe, expect, test } from 'bun:test';
import {
  getArtistKey,
  getArtistPrintings,
  getCatalogArtists,
  getArtistDirectory,
  hasArtistCredit,
  isArtistLinkUrl,
  isArtistShowcaseVariant,
} from './artists.ts';
import cardsJson from '../../server/db/json/card-list.json';
import type { CardList } from '../../lib/swu-resources/types.ts';

const card = (cardsJson as unknown as CardList)['admiral-ackbar--brilliant-strategist']!;
const catalog = { [card.cardId]: card };

describe('artist showcases', () => {
  test('combines only explicit aliases, counts unique cards, and keeps original printing credits', () => {
    const alternate = {
      ...card,
      cardId: 'alias-card',
      variants: {
        alias: {
          ...Object.values(card.variants)[0]!,
          variantId: 'alias-printing',
          artist: 'L. Harrington',
          variantName: 'Showcase',
        },
      },
    };
    const source = { ...catalog, 'alias-card': alternate };
    const identity = {
      key: 'luke harrington',
      name: 'Luke Harrington',
      creditKeys: ['luke harrington', 'l. harrington'],
    };
    const printings = getArtistPrintings(source, identity.key, { creditKeys: identity.creditKeys });
    expect(printings).toHaveLength(2);
    expect(printings.map(({ variant }) => variant.artist)).toContain('L. Harrington');
    const directory = getArtistDirectory(source, [identity]);
    expect(directory.filter(artist => artist.key === identity.key)).toHaveLength(1);
    expect(directory.find(artist => artist.key === identity.key)).toMatchObject({
      cardCount: 2,
      printingCount: 2,
      credits: ['L. Harrington', 'Luke Harrington'],
    });
    expect(directory.some(artist => artist.key === 'l. harrington')).toBe(false);
    expect(getArtistDirectory(source).some(artist => artist.key === 'l. harrington')).toBe(true);
    expect(getArtistPrintings(source, 'Luke')).toEqual([]);
  });
  test('normalizes case, whitespace and Unicode without merging distinct credits', () => {
    expect(getArtistKey('  Élodie   A.  ')).toBe(getArtistKey('e\u0301lodie A.'));
    expect(getArtistKey('Élodie')).not.toBe(getArtistKey('Elodie'));
    expect(getArtistKey('A-B')).not.toBe(getArtistKey('AB'));
    expect(hasArtistCredit(' UNKNOWN ')).toBe(false);
    expect(hasArtistCredit('  ')).toBe(false);
  });

  test('lists matching artwork without duplicate treatments or another artist’s version', () => {
    const printings = getArtistPrintings(catalog, '  LUKE HARRINGTON ');
    expect(printings).toHaveLength(1);
    expect(printings.map(({ variant }) => variant.variantName)).toEqual(['Standard']);
    expect(
      getArtistPrintings(catalog, 'Luke Harrington', { includeDuplicates: true }),
    ).toHaveLength(2);
    expect(getArtistPrintings(catalog, 'Luke')).toEqual([]);
    expect(getArtistPrintings(catalog, '')).toEqual([]);
  });

  test('counts logical cards separately from printings and includes new preview credits', () => {
    const preview = {
      ...card,
      cardId: 'preview-card',
      preview: true,
      variants: {
        preview: {
          ...Object.values(card.variants)[0]!,
          variantId: 'preview',
          artist: 'New Artist',
        },
      },
    };
    expect(getCatalogArtists({ ...catalog, [preview.cardId]: preview })).toEqual([
      { key: 'david buisan', name: 'David Buisan', cardCount: 1, printingCount: 1 },
      { key: 'luke harrington', name: 'Luke Harrington', cardCount: 1, printingCount: 1 },
      { key: 'new artist', name: 'New Artist', cardCount: 1, printingCount: 1 },
    ]);
    expect(
      getArtistPrintings({ [preview.cardId]: preview }, 'new artist')[0].variant.variantId,
    ).toBe('preview');
  });

  test('excludes Foil, Hyperspace and Serialized anywhere in a treatment name', () => {
    const variant = Object.values(card.variants)[0]!;
    for (const variantName of [
      'Foil',
      'Prestige Foil',
      'HYPERSPACE',
      'Hyperspace Foil',
      'Prestige Serialized',
    ]) {
      expect(isArtistShowcaseVariant({ ...variant, variantName })).toBe(false);
    }
    for (const variantName of ['Standard', 'Showcase', 'Prestige', 'SQ Prize Wall']) {
      expect(isArtistShowcaseVariant({ ...variant, variantName })).toBe(true);
    }
  });

  test('only exposes public HTTP links', () => {
    expect(isArtistLinkUrl('https://example.com/portfolio')).toBe(true);
    expect(isArtistLinkUrl('http://example.com')).toBe(true);
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      '/relative',
      'https://user:secret@example.com',
    ]) {
      expect(isArtistLinkUrl(url)).toBe(false);
    }
  });
});
