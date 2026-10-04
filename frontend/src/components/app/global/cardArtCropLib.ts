type ArtRegion = { x: number; y: number; width: number; height: number };

// Shared portrait window: Aayla's left/top, Luke's right, upgrade's bottom.
export const portraitArtRegion: ArtRegion = { x: 49, y: 63, width: 199, height: 172 };
const portraitArtRatio = portraitArtRegion.width / portraitArtRegion.height;

function fitArtRegion(region: ArtRegion): ArtRegion {
  const width = Math.min(region.width, region.height * portraitArtRatio);
  const height = width / portraitArtRatio;
  return {
    x: region.x + (region.width - width) / 2,
    y: region.y + (region.height - height) / 2,
    width,
    height,
  };
}

export function getCardArtRegion(type: string, horizontal: boolean): ArtRegion | undefined {
  if (type === 'Base') return { x: 29, y: 50, width: 360, height: 196 };
  if (horizontal) {
    // Measured on Chancellor Palpatine's back (Darth Sidious): retain the
    // top-left scene and face, clear of the title/rules box on the right.
    if (type === 'Leader') return { x: 30, y: 28, width: 145, height: 145 / portraitArtRatio };
    // Landscape tokens/Prestige variants have different, unmeasured frames.
    return undefined;
  }
  if (type === 'Event') return fitArtRegion({ x: 30, y: 217, width: 239, height: 164 });
  return portraitArtRegion;
}
