import { z } from 'zod';
import type { ArtistPrinting } from '../../../../../shared/lib/artists.ts';
import { containsAllWords } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';
import { setInfo, type SetInfo } from '../../../../../lib/swu-resources/set-info.ts';
import { getCardArtRegion } from '@/components/app/global/cardArtCropLib.ts';

// Unmeasured frames stay in the full-card gallery, but cannot provide an art preview.
export function hasArtistArtCrop({ card, variant }: ArtistPrinting) {
  const side = card.type === 'Leader' ? 'back' : 'front';
  return !!(
    variant.image[side] &&
    getCardArtRegion(card.type, variant[side]?.horizontal ?? card[side]?.horizontal ?? false)
  );
}

export const artistGallerySearchSchema = z.object({
  artistSearch: z.string().max(150).optional().catch(undefined),
  artistSet: z.string().max(100).optional().catch(undefined),
  artistTreatment: z.string().max(100).optional().catch(undefined),
  artistArtwork: z.string().max(1000).optional().catch(undefined),
});
export type ArtistGallerySearch = z.infer<typeof artistGallerySearchSchema>;
export const getArtistArtworkKey = ({ card, variant }: ArtistPrinting) =>
  `${card.cardId}:${variant.variantId}`;
const artistSets: Partial<Record<string, SetInfo>> = setInfo;
export const getArtistSetName = (set: string) => artistSets[set]?.name ?? set.toUpperCase();
export function filterArtistPrintings(printings: ArtistPrinting[], search: ArtistGallerySearch) {
  return printings.filter(
    ({ card, variant }) =>
      (!search.artistSearch ||
        containsAllWords([card.name, card.title].filter(Boolean).join(' '), search.artistSearch)) &&
      (!search.artistSet || variant.set === search.artistSet) &&
      (!search.artistTreatment || variant.variantName === search.artistTreatment),
  );
}
