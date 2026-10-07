import { expect, test } from 'bun:test';
import { moveImageCrop, resizeImageCropFromCorner } from './imageCropGeometry.ts';

test('corner resizing keeps square avatars bounded, including the minimum size', () => {
  const crop = { left: 50, top: 75, width: 200, height: 200 };
  const dimensions = { width: 500, height: 400 };
  expect(resizeImageCropFromCorner(crop, dimensions, 100, 100, 100, 100)).toEqual({
    ...crop,
    width: 300,
    height: 300,
  });
  expect(resizeImageCropFromCorner(crop, dimensions, 9999, 9999, 100, 100)).toEqual({
    ...crop,
    width: 325,
    height: 325,
  });
  expect(resizeImageCropFromCorner(crop, dimensions, -9999, -9999, 100, 100)).toEqual({
    ...crop,
    width: 100,
    height: 100,
  });
});

test('header corners retain 4:1 or wider ratios while growing beyond 400 pixels and shrinking below 1500', () => {
  const crop = { left: 100, top: 50, width: 1600, height: 400 };
  const dimensions = { width: 2400, height: 800 };
  expect(resizeImageCropFromCorner(crop, dimensions, 400, 100, 4, 1)).toEqual({
    ...crop,
    width: 2000,
    height: 500,
  });
  expect(resizeImageCropFromCorner(crop, dimensions, -800, -200, 4, 1)).toEqual({
    ...crop,
    width: 800,
    height: 200,
  });
  expect(resizeImageCropFromCorner(crop, dimensions, -9999, -9999, 4, 1)).toEqual({
    ...crop,
    width: 4,
    height: 1,
  });
  expect(resizeImageCropFromCorner(crop, dimensions, 9999, 9999, 4, 1)).toEqual({
    ...crop,
    width: 2300,
    height: 575,
  });
  const wide = { left: 0, top: 0, width: 1500, height: 300 };
  expect(resizeImageCropFromCorner(wide, dimensions, 500, 100, 4, 1)).toEqual({
    ...wide,
    width: 2000,
    height: 400,
  });
  const odd = { left: 0, top: 0, width: 1503, height: 375 };
  expect(resizeImageCropFromCorner(odd, dimensions, 0, 0, 4, 1)).toEqual(odd);
  const resized = resizeImageCropFromCorner(odd, dimensions, 1, 0, 4, 1);
  expect(resized.width).toBeGreaterThanOrEqual(resized.height * 4);
});

test('dragging square and rectangular crops clamps both positions within the image', () => {
  const crop = { left: 100, top: 50, width: 1600, height: 400 };
  const dimensions = { width: 2400, height: 800 };
  expect(moveImageCrop(crop, dimensions, 9999, -9999)).toEqual({ ...crop, left: 800, top: 0 });
  expect(moveImageCrop(crop, dimensions, -9999, 9999)).toEqual({ ...crop, left: 0, top: 400 });
});
