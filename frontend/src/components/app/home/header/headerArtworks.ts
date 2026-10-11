// Original image_gallery records supplied by the owner. Gallery titles match catalog
// variant IDs; export:header-artwork generates the matching artist credits.
// These are references to existing public gallery objects, not copies; keep the
// source objects available while their header compositions are in use.
export interface HeaderArtwork {
  galleryId: string;
  name: string;
  galleryTitle: string;
  imageKey: string;
  thumbnailKey: string;
  width: number;
  height: number;
}
export const headerImageBaseUrl = 'https://images.swubase.com';
export const headerArtworks = {
  theed: {
    galleryId: 'cbd22c3b-a188-41fa-bd1a-9cf8924b6ce8',
    name: 'Theed Palace (Homeworlds)',
    galleryTitle: 'theed-palace-25-homeworlds',
    imageKey: 'image-gallery/cbd22c3b-a188-41fa-bd1a-9cf8924b6ce8.webp',
    thumbnailKey: 'image-gallery/cbd22c3b-a188-41fa-bd1a-9cf8924b6ce8-thumb.webp',
    width: 1080,
    height: 802,
  },
  shield: {
    galleryId: '1171ca10-eac0-4332-b22b-bfb49874b9c9',
    name: 'Shield Generator Complex',
    galleryTitle: 'shield-generator-complex-97-2025-promo',
    imageKey: 'image-gallery/1171ca10-eac0-4332-b22b-bfb49874b9c9.webp',
    thumbnailKey: 'image-gallery/1171ca10-eac0-4332-b22b-bfb49874b9c9-thumb.webp',
    width: 650,
    height: 491,
  },
} as const satisfies Record<string, HeaderArtwork>;

export type HeaderArtworkKey = keyof typeof headerArtworks;
