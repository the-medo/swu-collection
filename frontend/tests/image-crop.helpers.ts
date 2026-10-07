import type { Locator, Page } from 'playwright/test';

async function dragCrop(
  page: Page,
  canvas: Locator,
  deltaX: number,
  deltaY: number,
  corner: boolean,
) {
  await canvas.scrollIntoViewIfNeeded();
  const { start, end } = await canvas.evaluate(
    (svg, delta) => {
      const rectangle = svg.querySelector('rect')!;
      const x =
        Number(rectangle.getAttribute('x')) +
        Number(rectangle.getAttribute('width')) * (delta.corner ? 1 : 0.5);
      const y =
        Number(rectangle.getAttribute('y')) +
        Number(rectangle.getAttribute('height')) * (delta.corner ? 1 : 0.5);
      const matrix = (svg as SVGSVGElement).getScreenCTM()!;
      const start = new DOMPoint(x, y).matrixTransform(matrix);
      const end = new DOMPoint(x + delta.x, y + delta.y).matrixTransform(matrix);
      const inset = delta.corner ? 2 : 0;
      return {
        start: { x: start.x - inset, y: start.y - inset },
        end: { x: end.x - inset, y: end.y - inset },
      };
    },
    { x: deltaX, y: deltaY, corner },
  );
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await page.mouse.up();
}

export function dragCropCorner(page: Page, canvas: Locator, deltaX: number, deltaY: number) {
  return dragCrop(page, canvas, deltaX, deltaY, true);
}

export function dragCropBody(page: Page, canvas: Locator, deltaX: number, deltaY: number) {
  return dragCrop(page, canvas, deltaX, deltaY, false);
}
