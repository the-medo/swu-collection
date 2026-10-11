import { expect, test } from 'bun:test';
import cards from '../../../../../server/db/json/card-list.json';
import { getArtistDirectory, getArtistKey } from '../../../../../shared/lib/artists.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { hasArtistArtCrop } from './artistGallery.ts';
import {
  artistDirectorySearchSchema,
  getArtistCollage,
  sortArtistDirectory,
} from './artistDirectoryHelpers.ts';

// Only identities needed by these behavioral tests; production profiles come from the API.
const identities = [
  {
    key: 'benjamin paulus van onzen',
    name: 'Benjamin Paulus van Onzen',
    creditKeys: ['benjamin paulus van onzen', 'benjamin paulus', 'paulus van onzen'],
  },
  { key: 'axel hutt', name: 'Axel Hutt', creditKeys: ['axel hutt', 'amélie hutt'] },
  { key: 'reno', name: 'Renaud Scheidt (Reno)', creditKeys: ['reno', 'renaud scheidt'] },
];
const artists = getArtistDirectory(cards as unknown as CardList, identities, {
  featuredFilter: hasArtistArtCrop,
});

test('confirmed credit aliases resolve to one directory entry with combined cards', () => {
  const benjamin = artists.filter(artist => artist.name === 'Benjamin Paulus van Onzen');
  expect(benjamin).toHaveLength(1);
  expect(benjamin[0].creditKeys).toEqual(
    expect.arrayContaining(['benjamin paulus', 'benjamin paulus van onzen', 'paulus van onzen']),
  );
  const axel = sortArtistDirectory(artists, {
    artistSort: 'name',
    artistDirectorySearch: 'Amélie Hutt',
  });
  expect(axel).toHaveLength(1);
  expect(axel[0].name).toBe('Axel Hutt');
  expect(axel[0].creditKeys).toContain('amélie hutt');
  expect(axel[0].creditKeys).toContain('axel hutt');
});

test('directory sorts names and counts deterministically without mutating the catalog', () => {
  const original = artists.map(artist => artist.key);
  const ascending = sortArtistDirectory(artists, { artistSort: 'name' });
  expect(sortArtistDirectory(artists, { artistSort: 'name-desc' })).toEqual(
    [...ascending].reverse(),
  );
  for (const sort of ['cards', 'printings'] as const) {
    const sorted = sortArtistDirectory(artists, { artistSort: sort });
    const field = sort === 'cards' ? 'cardCount' : 'printingCount';
    expect(
      sorted.every((entry, index) => index === 0 || sorted[index - 1][field] >= entry[field]),
    ).toBe(true);
  }
  expect(artists.map(artist => artist.key)).toEqual(original);
  expect(
    artistDirectorySearchSchema.parse({ artistSort: 'unknown', artistDirectorySearch: [] }),
  ).toEqual({ artistSort: 'name' });
});

test('collage keeps Vader and Chimaera and features the requested iconic subjects', () => {
  const collage = getArtistCollage(cards as unknown as CardList, artists);
  expect(collage.map(entry => entry.printing.card.title)).toEqual([
    'Darth Vader',
    'Luke Skywalker',
    'Chimaera',
    'Ahsoka Tano',
    'The Mandalorian',
    'Anakin Skywalker',
    'Obi-Wan Kenobi',
    'Millennium Falcon',
    'Chewbacca',
    'Han Solo',
  ]);
  expect(collage[0].printing.variant.variantId).toBe(
    'darth-vader--dark-lord-of-the-sith-74-2025-promo',
  );
  expect(collage[2].printing.variant.variantId).toBe(
    'chimaera--reinforcing-the-center-1017-jump-to-lightspeed---standard-prestige',
  );
  expect(collage[2].artist.name).toBe('Renaud Scheidt (Reno)');
  expect(new Set(collage.map(entry => entry.artist.key)).size).toBe(10);
  expect(collage.every(entry => hasArtistArtCrop(entry.printing))).toBe(true);
  expect(
    collage.every(entry =>
      entry.artist.creditKeys.includes(getArtistKey(entry.printing.variant.artist)),
    ),
  ).toBe(true);
  expect(getArtistCollage(cards as unknown as CardList, [...artists].reverse())).toEqual(collage);
  expect(
    getArtistCollage(
      cards as unknown as CardList,
      artists.map(artist => ({ ...artist, featured: [] })),
    ).map(entry => entry.printing.variant.variantId),
  ).toEqual(collage.map(entry => entry.printing.variant.variantId));
});

test('collage skips missing printings and unavailable crops without substituting a different artist', () => {
  const collage = getArtistCollage(cards as unknown as CardList, artists);
  const { card, variant } = collage[0].printing;
  const onlyVader = { [card.cardId]: card };
  expect(getArtistCollage({}, artists)).toEqual([]);
  expect(getArtistCollage(onlyVader, [])).toEqual([]);
  expect(getArtistCollage(onlyVader, artists)).toEqual([collage[0]]);
  expect(getArtistCollage({ [card.cardId]: { ...card, variants: {} } }, artists)).toEqual([]);
  expect(
    getArtistCollage(
      {
        [card.cardId]: {
          ...card,
          variants: {
            [variant.variantId]: { ...variant, image: { ...variant.image, back: null } },
          },
        },
      },
      artists,
    ),
  ).toEqual([]);
});
