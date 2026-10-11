import type { HeaderArtworkKey } from './headerArtworks.ts';

// Percentages describe each unrotated layer box relative to the header artboard.
// Rotation is clockwise around the box centre; images use object-fit: cover.
// The attribution export uses these same desktop and mobile placements.
export type HeaderFrame = readonly [
  left: number,
  top: number,
  width: number,
  height: number,
  rotation: number,
];

export interface HeaderLayer {
  image: HeaderArtworkKey;
  frame: HeaderFrame;
  mobileFrame: HeaderFrame;
  focus: readonly [x: number, y: number];
  opacity: number;
}

export const homepageHeaderLayers: readonly HeaderLayer[] = [
  {
    image: 'theed',
    frame: [-5, -16, 50, 140, -3],
    // A smaller vertical object-position lowers the palace within its crop.
    focus: [42, 32],
    mobileFrame: [-28, -14, 92, 111, -4],
    opacity: 0.8,
  },
  {
    image: 'shield',
    frame: [59, -15, 50, 140, 3],
    focus: [49, 46],
    mobileFrame: [40, -7, 96, 113, 3],
    opacity: 1,
  },
];
