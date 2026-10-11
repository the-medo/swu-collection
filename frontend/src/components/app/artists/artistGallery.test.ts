import { expect, test } from 'bun:test';
import cards from '../../../../../server/db/json/card-list.json';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { getArtistPrintings } from '../../../../../shared/lib/artists.ts';
import {
  artistGallerySearchSchema,
  filterArtistPrintings,
  getArtistSetName,
  getArtistArtworkKey,
} from './artistGallery.ts';

test('gallery filters match the same printing and tolerate malformed links and promo sets', () => {
  const printings = getArtistPrintings(cards as unknown as CardList, 'david buisan');
  const ackbar = printings.find(
    ({ card }) => card.cardId === 'admiral-ackbar--brilliant-strategist',
  )!;
  expect(
    filterArtistPrintings(printings, {
      artistSearch: 'ACKBAR',
      artistSet: ackbar.variant.set,
      artistTreatment: ackbar.variant.variantName,
    }),
  ).toContain(ackbar);
  expect(
    filterArtistPrintings(printings, { artistSearch: 'ACKBAR', artistSet: 'nonexistent' }),
  ).toEqual([]);
  expect(filterArtistPrintings(printings, { artistTreatment: 'Foil' })).toEqual([]);
  expect(getArtistSetName('new-promo')).toBe('NEW-PROMO');
  expect(getArtistArtworkKey(ackbar)).toContain(ackbar.variant.variantId);
  expect(
    artistGallerySearchSchema.parse({ artistSearch: ['bad'], artistSet: 42, artistArtwork: {} }),
  ).toEqual({ artistSearch: undefined, artistSet: undefined, artistArtwork: undefined });
});
