import { z } from 'zod';
import {
  getArtistKey,
  isArtistShowcaseVariant,
  type getArtistDirectory,
} from '../../../../../shared/lib/artists.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { containsAllWords } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';
import { hasArtistArtCrop } from './artistGallery.ts';

export const artistDirectorySortSchema = z.enum(['name', 'name-desc', 'cards', 'printings']);
export const artistDirectorySearchSchema = z.object({
  artistDirectorySearch: z.string().max(150).optional().catch(undefined),
  artistSort: artistDirectorySortSchema.catch('name').default('name'),
});
export type ArtistDirectorySearch = z.infer<typeof artistDirectorySearchSchema>;
export type ArtistDirectoryEntry = ReturnType<typeof getArtistDirectory>[number];

const compareNames = (a: ArtistDirectoryEntry, b: ArtistDirectoryEntry) =>
  a.name.localeCompare(b.name) || a.key.localeCompare(b.key);

export function sortArtistDirectory(
  artists: ArtistDirectoryEntry[],
  search: ArtistDirectorySearch,
) {
  return artists
    .filter(artist =>
      containsAllWords(
        [artist.name, ...artist.credits, ...artist.creditKeys].join(' '),
        search.artistDirectorySearch ?? '',
      ),
    )
    .sort((a, b) => {
      if (search.artistSort === 'name-desc') return compareNames(b, a);
      if (search.artistSort === 'cards') return b.cardCount - a.cardCount || compareNames(a, b);
      if (search.artistSort === 'printings')
        return b.printingCount - a.printingCount || compareNames(a, b);
      return compareNames(a, b);
    });
}

// Pin exact artwork, independent of directory sorting and each artist's featured cards.
const collagePrintings = [
  ['darth-vader--dark-lord-of-the-sith', 'darth-vader--dark-lord-of-the-sith-74-2025-promo'],
  ['luke-skywalker--jedi-knight', 'luke-skywalker--jedi-knight-51-spark-of-rebellion'],
  [
    'chimaera--reinforcing-the-center',
    'chimaera--reinforcing-the-center-1017-jump-to-lightspeed---standard-prestige',
  ],
  ['ahsoka-tano--snips', 'ahsoka-tano--snips-268-twilight-of-the-republic'],
  [
    'the-mandalorian--sworn-to-the-creed',
    'the-mandalorian--sworn-to-the-creed-280-shadows-of-the-galaxy',
  ],
  [
    'anakin-skywalker--what-it-takes-to-win',
    'anakin-skywalker--what-it-takes-to-win-269-twilight-of-the-republic',
  ],
  ['obi-wan-kenobi--patient-mentor', 'obi-wan-kenobi--patient-mentor-260-twilight-of-the-republic'],
  ['millennium-falcon--piece-of-junk', 'millennium-falcon--piece-of-junk-193-spark-of-rebellion'],
  ['chewbacca--walking-carpet', 'chewbacca--walking-carpet-255-spark-of-rebellion'],
  ['han-solo--audacious-smuggler', 'han-solo--audacious-smuggler-267-spark-of-rebellion'],
] as const;

export function getArtistCollage(cards: CardList, artists: ArtistDirectoryEntry[]) {
  const artistsByCredit = new Map(
    artists.flatMap(artist => artist.creditKeys.map(key => [key, artist] as const)),
  );
  return collagePrintings.flatMap(([cardId, variantId]) => {
    const card = cards[cardId];
    const variant = card?.variants[variantId];
    if (!card || !variant || !isArtistShowcaseVariant(variant)) return [];
    const artist = artistsByCredit.get(getArtistKey(variant.artist));
    const printing = { card, variant };
    if (!artist || !hasArtistArtCrop(printing)) return [];
    return [{ artist, printing }];
  });
}
