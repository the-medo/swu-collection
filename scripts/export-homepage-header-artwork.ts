import { resolve } from 'node:path';
import {
  headerArtworks,
  headerImageBaseUrl,
} from '../frontend/src/components/app/home/header/headerArtworks.ts';
import { homepageHeaderLayers } from '../frontend/src/components/app/home/header/homepageHeaderArtwork.ts';
import type { CardList } from '../lib/swu-resources/types.ts';

// Gallery titles are exact card variant IDs. Resolve the artist for that printing,
// not the card's default artwork, and ship only this small credit list to the browser.
const cards: CardList = await Bun.file(
  resolve(import.meta.dir, '../server/db/json/card-list.json'),
).json();
const printings = new Map(
  Object.values(cards).flatMap(card =>
    card
      ? Object.values(card.variants).flatMap(variant =>
          variant ? [[variant.variantId, { cardId: card.cardId, variant }] as const] : [],
        )
      : [],
  ),
);
const credits = Object.fromEntries(
  Object.entries(headerArtworks).map(([key, art]) => {
    const printing = printings.get(art.galleryTitle);
    const artist = printing?.variant.artist.trim();
    if (!printing || !artist)
      throw new Error(`Missing catalog artist for header artwork: ${art.galleryTitle}`);
    return [key, { artist, cardId: printing.cardId, variantId: printing.variant.variantId }];
  }),
);

// The rendering manifest is the source of truth for every placement in the CSV.
// Frames are percentages of the artboard before rotation around the box centre.
// The mobile frame applies at viewport widths <= 640px. Focus is object-position
// with object-fit: cover, expressed as percentages of the image's free crop space.
const columns = [
  'layer_back_to_front',
  'image_name',
  'gallery_title',
  'gallery_id',
  'source_url',
  'artist',
  'opacity',
  'desktop_left_pct',
  'desktop_top_pct',
  'desktop_width_pct',
  'desktop_height_pct',
  'desktop_rotation_clockwise_deg',
  'mobile_left_pct',
  'mobile_top_pct',
  'mobile_width_pct',
  'mobile_height_pct',
  'mobile_rotation_clockwise_deg',
  'crop_focus_x_pct',
  'crop_focus_y_pct',
];
const rows = homepageHeaderLayers.map((layer, index) => {
  const art = headerArtworks[layer.image];
  return [
    index + 1,
    art.name,
    art.galleryTitle,
    art.galleryId,
    `${headerImageBaseUrl}/${art.imageKey}`,
    credits[layer.image]!.artist,
    layer.opacity,
    ...layer.frame,
    ...layer.mobileFrame,
    ...layer.focus,
  ];
});
const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const csv = [columns, ...rows].map(row => row.map(escape).join(',')).join('\n') + '\n';
const destination = resolve(import.meta.dir, '../docs/homepage-header-artwork.csv');
const creditsDestination = resolve(
  import.meta.dir,
  '../frontend/src/components/app/home/header/headerArtworkCredits.json',
);
for (const [path, content] of [
  [destination, csv],
  [creditsDestination, JSON.stringify(credits, null, 2) + '\n'],
] as const) {
  if (process.argv.includes('--check')) {
    const file = Bun.file(path);
    if (!(await file.exists()) || (await file.text()) !== content)
      throw new Error(`${path} is out of date. Run bun run export:header-artwork.`);
  } else {
    await Bun.write(path, content);
  }
}
console.log(
  `${process.argv.includes('--check') ? 'Verified' : 'Exported'} ${Object.keys(credits).length} catalog credits and ${rows.length} header placements.`,
);
