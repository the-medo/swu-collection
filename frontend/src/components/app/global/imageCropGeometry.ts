export type ImageDimensions = { width: number; height: number };
export type ImageCrop = ImageDimensions & { left: number; top: number };

export const clampCropPosition = (value: number, max: number) =>
  Math.max(0, Math.min(max, Math.round(value)));

export function moveImageCrop(
  crop: ImageCrop,
  dimensions: ImageDimensions,
  deltaX: number,
  deltaY: number,
): ImageCrop {
  return {
    ...crop,
    left: clampCropPosition(crop.left + deltaX, dimensions.width - crop.width),
    top: clampCropPosition(crop.top + deltaY, dimensions.height - crop.height),
  };
}

export function resizeImageCropFromCorner(
  crop: ImageCrop,
  dimensions: ImageDimensions,
  deltaX: number,
  deltaY: number,
  minimumWidth: number,
  minimumHeight: number,
): ImageCrop {
  // Resize both axes together, retaining the selected ratio and the top-left anchor.
  const min = Math.max(minimumWidth, Math.ceil((minimumHeight * crop.width) / crop.height));
  const max = Math.min(
    dimensions.width - crop.left,
    Math.floor(((dimensions.height - crop.top) * crop.width) / crop.height),
  );
  const width = Math.max(
    min,
    Math.min(max, Math.round(crop.width + Math.max(deltaX, (deltaY * crop.width) / crop.height))),
  );
  // Integer arithmetic preserves unchanged crops and rounds toward a wider ratio.
  const height = Math.max(minimumHeight, Math.floor((width * crop.height) / crop.width));
  return { ...crop, width, height };
}
