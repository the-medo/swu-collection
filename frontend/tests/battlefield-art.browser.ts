// BATTLEFIELD_ART_BROWSER_TEST=1 bun frontend/tests/battlefield-art.browser.ts
// Rasterize the production SVG renderer in Chromium; no app, auth or database fixtures needed.
// Requires network access to images.swubase.com for the published texture assets.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium, expect } from 'playwright/test';
import { BattlefieldCanvas } from '../src/components/app/battlefield/BattlefieldCanvas';
import { BattlefieldArt } from '../src/components/app/battlefield/BattlefieldArt';
import { battlefieldCatalog, battlefieldItems } from '../../shared/battlefield/catalog.ts';
import { battlefieldPlanetTextureIds } from '../../shared/battlefield/planets.ts';
import { defaultBattlefieldScene, type BattlefieldScene } from '../../shared/types/battlefield.ts';
import {
  battlefieldPlanetTextureImages,
  battlefieldPlanetGrainImage,
} from '../src/components/app/battlefield/battlefieldPlanetTextureImages';

if (process.env.BATTLEFIELD_ART_BROWSER_TEST !== '1')
  throw new Error('Explicitly enable the rendering check.');
// Standalone serialized SVGs need their real texture assets embedded to rasterize.
const textures = await Promise.all(
  [...Object.values(battlefieldPlanetTextureImages), battlefieldPlanetGrainImage].map(async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/png'))
      throw new Error(`Could not load Battlefield texture ${url}: HTTP ${response.status}`);
    return [
      url,
      'data:image/png;base64,' + Buffer.from(await response.arrayBuffer()).toString('base64'),
    ];
  }),
);
const browser = await chromium.launch({ timeout: 30_000 });
const timeout = setTimeout(() => {
  void browser.close({ reason: 'Battlefield rendering check timed out.' });
}, 30_000);
let sequence = 0;
const render = (node: Parameters<typeof renderToStaticMarkup>[0]) => {
  let svg = renderToStaticMarkup(node, { identifierPrefix: `art-check-${sequence++}-` });
  for (const [path, data] of textures) svg = svg.replaceAll(`href="${path}"`, `href="${data}"`);
  if (/href="(?!data:|#)/.test(svg)) throw new Error('A standalone texture was not embedded.');
  return svg;
};
const base = defaultBattlefieldScene();
const placement = (itemId: string, order: number) => ({
  ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
  itemId,
  x: 800,
  y: 200,
  rotation: 0,
  scale: 1,
  order,
});
const results: { name: string; hiddenDifferences: number; frontDifferences: number }[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 800 } });
  // Hull panel lines must stop at the superlaser dish, including its upper rim.
  await page.setContent(
    render(
      createElement(
        'svg',
        { viewBox: '-60 -60 120 120', width: 600, height: 600 },
        createElement(BattlefieldArt, {
          item: battlefieldItems['station-death-star']!,
          lightDirection: { x: -0.6, y: -0.8 },
          frame: { x: -60, y: -60, width: 120, height: 120 },
        }),
      ),
    ),
  );
  const dishPanelDifferences = await page.evaluate(async () => {
    const svg = document.querySelector('svg')!;
    const raster = async () => {
      const image = new Image();
      image.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 600;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, 600, 600).data;
    };
    const withPanels = await raster();
    const panels = svg.querySelectorAll('g[transform="scale(1 1)"], g[transform="scale(1 -1)"]');
    if (panels.length !== 2) throw new Error('Missing mirrored hull panel detail.');
    panels.forEach(panel => panel.remove());
    const withoutPanels = await raster();
    let differences = 0;
    for (let y = 0; y < 600; y++)
      for (let x = 0; x < 600; x++) {
        // Include the upper rim where the second line crossed, inside its opaque stroke.
        if (Math.hypot((x + 0.5) / 5 - 60 - 17, (y + 0.5) / 5 - 60 + 20) >= 13.5) continue;
        const index = (y * 600 + x) * 4;
        if (
          withPanels[index] !== withoutPanels[index] ||
          withPanels[index + 1] !== withoutPanels[index + 1] ||
          withPanels[index + 2] !== withoutPanels[index + 2]
        )
          differences++;
      }
    return differences;
  });
  expect(dishPanelDifferences, 'Hull panel lines must never cross the superlaser dish').toBe(0);
  // Measure the actual renderer, including its viewport transforms and padding.
  const modelLengths: [string, number][] = [
    ['ship-x-wing', 20],
    ['ship-vulture', 10],
    ['ship-tie', 13.42],
    ['ship-interceptor', 14.33],
    ['ship-corvette', 40],
    ['ship-home-one', 80],
    ['ship-chimaera', 1600 / 15],
    ['ship-invincible', 2177.35 / 15],
    ['ship-vuutun-palaa', 3356.9 / 15],
    ['ship-executor', 400],
    ['ship-tantive-iv', 40],
    ['ship-lightmaker', 35],
    ['ship-liberty', 80],
    ['ship-redemption', 50],
    ['ship-profundity', 1204.44 / 15],
    ['ship-resolute', 1155 / 15],
    ['ship-tranquility', 1155 / 15],
    ['ship-raddus', 3438.41 / 15],
    ['ship-avenger', 1600 / 15],
    ['ship-devastator', 1600 / 15],
    ['ship-relentless', 1600 / 15],
    ['ship-corvus', 40],
    ['ship-gideons-light-cruiser', 60],
    ['ship-finalizer', 2915.81 / 15],
    ['ship-invisible-hand', 1088 / 15],
    ['ship-malevolence', 4845 / 15],
    ['station-death-star', 240],
  ];
  for (const scale of [1, 0.5]) {
    await page.setContent(
      render(
        createElement(BattlefieldCanvas, {
          scene: {
            ...base,
            placements: modelLengths.map(([id], order) => ({ ...placement(id, order), scale })),
          },
        }),
      ),
    );
    const sizes = await page.evaluate(() => {
      document.querySelector('svg')!.setAttribute('width', '1600');
      document.querySelector('svg')!.setAttribute('height', '400');
      return Array.from(document.querySelectorAll('g[id$="-surface"]')).map(node => {
        const box = node.getBoundingClientRect();
        const circles = Array.from(node.querySelectorAll('circle')).map(circle => {
          const b = circle.getBoundingClientRect();
          return Math.abs(b.width - b.height);
        });
        return { width: box.width, height: box.height, circles };
      });
    });
    for (const [[id, expected], i] of modelLengths.map((entry, i) => [entry, i] as const)) {
      expect(
        Math.abs(sizes[i].width - expected * scale),
        id + ' visible model length',
      ).toBeLessThan(0.75);
      expect(
        Math.abs(sizes[i].height - battlefieldItems[id]!.height! * scale),
        id + ' visible model height',
      ).toBeLessThan(0.75);
      for (const difference of sizes[i].circles)
        expect(difference, id + ' round details stay round').toBeLessThan(0.05);
    }
  }
  for (const item of battlefieldCatalog.filter(
    item => item.category === 'Planets' || item.shape === 'death-star',
  )) {
    const ship = { ...placement('ship-executor', 0), colorId: 'color-crimson' };
    const planet = { ...placement(item.id, 1), scale: 3 };
    const child = crypto.randomUUID(),
      grandchild = crypto.randomUUID();
    const scene: BattlefieldScene = {
      ...base,
      layers: [
        ...base.layers,
        { id: child, name: 'Fleet', visible: true, parentId: base.layers[0].id, order: 0 },
        { id: grandchild, name: 'Wing', visible: true, parentId: child, order: 0 },
      ],
      placements: [{ ...ship, layerId: grandchild }, planet],
    };
    const expected = { ...scene, placements: [planet] };
    const foreground = { ...scene, placements: [{ ...ship, order: 2 }, planet] };
    await page.setContent(
      [expected, scene, foreground]
        .map(value => `<div>${render(createElement(BattlefieldCanvas, { scene: value }))}</div>`)
        .join(''),
    );
    const pixels = await page.evaluate(async () => {
      const images: Uint8ClampedArray[] = [];
      for (const svg of document.querySelectorAll('div > svg')) {
        svg.setAttribute('width', '1600');
        svg.setAttribute('height', '400');
        const image = new Image();
        image.src =
          'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(new XMLSerializer().serializeToString(svg));
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 400;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        images.push(context.getImageData(0, 0, 1600, 400).data);
      }
      const differences = (image: Uint8ClampedArray) => {
        let count = 0;
        for (let i = 0; i < image.length; i += 4)
          if (
            image[i] !== images[0][i] ||
            image[i + 1] !== images[0][i + 1] ||
            image[i + 2] !== images[0][i + 2] ||
            image[i + 3] !== images[0][i + 3]
          )
            count++;
        return count;
      };
      return {
        hiddenDifferences: differences(images[1]),
        frontDifferences: differences(images[2]),
      };
    });
    results.push({ name: item.name, ...pixels });
  }
  const samples: [string, number, number][] = [
    ['ship-tie', -8, 6],
    ['ship-interceptor', -8, 6],
    ['ship-x-wing', 25, 1],
    ['ship-corvette', -42, 25],
    ['ship-chimaera', -38, 30],
    ['ship-executor', -45, 12],
    ['ship-home-one', -36, 18],
    ['ship-vulture', 0, 0],
    ['ship-vulture', 0, -24],
    ['ship-invincible', 0, 0],
    ['ship-vuutun-palaa', 0, 0],
    ['ship-vuutun-palaa', -45, 10],
    ['ship-tantive-iv', -42, 25],
    ['ship-lightmaker', 42, 8],
    ['ship-liberty', -42, -25],
    ['ship-redemption', 0, 0],
    ['ship-profundity', 0, 15],
    ['ship-resolute', -30, -23],
    ['ship-tranquility', 0, 0],
    ['ship-raddus', -20, 22],
    ['ship-avenger', -38, 30],
    ['ship-devastator', -38, 30],
    ['ship-relentless', -38, 30],
    ['ship-corvus', -40, -22],
    ['ship-gideons-light-cruiser', -15, 14],
    ['ship-finalizer', -42, 23],
    ['ship-invisible-hand', 0, 0],
    ['ship-malevolence', 9, 23],
    ['asteroid-rock', 0, 0],
    ['station-orbital', 36, 15],
    ['station-outpost', 7, 20],
    ['station-death-star', -45, 0],
    ['station-death-star', 17, -20],
    ['station-death-star', 0, 6],
  ];
  const alpha: { name: string; value: number; expected: number }[] = [];
  const surfaces: [string, number, number, number][] = [
    ...samples.map(([id, x, y]) => [id, x, y, 255] as [string, number, number, number]),
    ['station-orbital', 20, 10, 0], // The opening between the hub, spokes and rim remains clear.
    ['ship-executor', 0, 55, 0], // Empty space within an object's rectangular frame stays clear.
    ['ship-vulture', 30, 0, 255],
    ['ship-vuutun-palaa', 50, 0, 0], // The forward docking gap is open space.
    ['ship-vuutun-palaa', 29, 0, 0], // The gap between the command sphere and the ring stays clear.
    ['ship-gideons-light-cruiser', 45, 0, 0], // A true opening between the two forward prongs.
    ['ship-finalizer', 57, 0, 0], // The Resurgent's split prow remains open.
    ['ship-redemption', 10, 8, 0], // Open space above/below the frigate's narrow spar.
    ['ship-liberty', 30, 28, 0], // Swept wings end aft; the bow stays narrow.
    ['station-death-star', 55, 0, 0], // The battle station has no halo or artwork outside its hull.
  ];
  for (const [id, x, y, expected] of surfaces) {
    const item = battlefieldItems[id];
    if (!item) throw new Error(`Missing catalog fixture: ${id}`);
    await page.setContent(
      render(
        createElement(
          'svg',
          { viewBox: '-60 -60 120 120', width: 600, height: 600 },
          createElement(BattlefieldArt, {
            item,
            lightDirection: { x: 1, y: 0 },
            frame: item.artBounds ?? { x: -60, y: -60, width: 120, height: 120 },
          }),
        ),
      ),
    );
    const value = await page.evaluate(
      async ({ x, y }) => {
        const svg = document.querySelector('svg')!;
        const image = new Image();
        image.src =
          'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(new XMLSerializer().serializeToString(svg));
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 600;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(Math.floor((x + 60) * 5), Math.floor((y + 60) * 5), 1, 1)
          .data[3];
      },
      { x, y },
    );
    alpha.push({ name: item.name, value, expected });
  }
  console.log('Planet occlusion:', JSON.stringify(results));
  console.log('Solid surface alpha:', JSON.stringify(alpha));
  for (const result of results) {
    expect(
      result.hiddenDifferences,
      result.name + ' must completely hide an Executor behind it',
    ).toBe(0);
    expect(
      result.frontDifferences,
      'An Executor in front of ' + result.name + ' must remain visible',
    ).toBeGreaterThan(0);
  }
  for (const result of alpha)
    expect(result.value, result.name + ' surface or opening opacity').toBe(result.expected);
  // Textures must add actual surface detail even when all variants use the same color.
  let previousSurface: number[] | undefined;
  for (const textureId of battlefieldPlanetTextureIds) {
    await page.setContent(
      render(
        createElement(
          'svg',
          { viewBox: '-120 -120 240 240', width: 240, height: 240 },
          createElement(BattlefieldArt, {
            item: battlefieldItems.planet!,
            textureId,
            color: '#c4b18b',
            lightDirection: { x: -0.6, y: -0.8 },
            frame: { x: -120, y: -120, width: 240, height: 240 },
          }),
        ),
      ),
    );
    const detail = await page.evaluate(async () => {
      const svg = document.querySelector('svg')!;
      const raster = async () => {
        const image = new Image();
        image.src =
          'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(new XMLSerializer().serializeToString(svg));
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 240;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return Array.from(context.getImageData(0, 0, 240, 240).data);
      };
      const textured = await raster();
      svg.querySelector('g[clip-path]')!.remove();
      const smooth = await raster();
      let differences = 0;
      for (let y = 70; y < 170; y++)
        for (let x = 70; x < 170; x++) {
          const offset = (y * 240 + x) * 4;
          if (
            textured[offset] !== smooth[offset] ||
            textured[offset + 1] !== smooth[offset + 1] ||
            textured[offset + 2] !== smooth[offset + 2]
          )
            differences++;
          if (textured[offset + 3] !== 255) throw new Error('Texture made the Planet transparent.');
        }
      return { differences, cornerAlpha: textured[3], textured };
    });
    expect(detail.differences, textureId + ' surface detail').toBeGreaterThan(500);
    expect(detail.cornerAlpha, textureId + ' texture is clipped to the sphere').toBe(0);
    if (previousSurface) expect(detail.textured).not.toEqual(previousSurface);
    previousSurface = detail.textured;
  }
  const lighting: { name: string; differences: number }[] = [];
  for (const item of battlefieldCatalog.filter(item => item.kind === 'object')) {
    const scene = { ...base, placements: [placement(item.id, 0)] };
    await page.setContent(
      [
        { x: 0, y: 200 },
        { x: 1600, y: 200 },
      ]
        .map(light => `<div>${render(createElement(BattlefieldCanvas, { scene, light }))}</div>`)
        .join(''),
    );
    const pixels = await page.evaluate(
      async ({ width, height }) => {
        const images: Uint8ClampedArray[] = [];
        for (const svg of document.querySelectorAll('div > svg')) {
          svg.setAttribute('width', '1600');
          svg.setAttribute('height', '400');
          const image = new Image();
          image.src =
            'data:image/svg+xml;charset=utf-8,' +
            encodeURIComponent(new XMLSerializer().serializeToString(svg));
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 1600;
          canvas.height = 400;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          images.push(context.getImageData(0, 0, 1600, 400).data);
        }
        let differences = 0,
          outsideDifferences = 0;
        for (let y = 0; y < 400; y++)
          for (let x = 0; x < 1600; x++) {
            const index = (y * 1600 + x) * 4;
            if (
              images[0][index] !== images[1][index] ||
              images[0][index + 1] !== images[1][index + 1] ||
              images[0][index + 2] !== images[1][index + 2] ||
              images[0][index + 3] !== images[1][index + 3]
            ) {
              differences++;
              if (Math.abs(x - 800) > width / 2 + 2 || Math.abs(y - 200) > height / 2 + 2)
                outsideDifferences++;
            }
          }
        const brightness = (image: Uint8ClampedArray, x: number) => {
          const index = (200 * 1600 + x) * 4;
          return image[index] + image[index + 1] + image[index + 2];
        };
        return {
          differences,
          outsideDifferences,
          leftBefore: brightness(images[0], 770),
          rightBefore: brightness(images[0], 830),
          leftAfter: brightness(images[1], 770),
          rightAfter: brightness(images[1], 830),
        };
      },
      { width: item.width ?? 80, height: item.height ?? 80 },
    );
    expect(pixels.differences, item.name + ' responds to the shared source').toBeGreaterThan(0);
    expect(pixels.outsideDifferences, 'The editor handle never becomes saved artwork').toBe(0);
    if (item.category === 'Planets') {
      expect(pixels.leftBefore).toBeGreaterThan(pixels.rightBefore);
      expect(pixels.rightAfter).toBeGreaterThan(pixels.leftAfter);
    }
    lighting.push({ name: item.name, differences: pixels.differences });
  }
  // A spherical planet retains world-space shading when the user rotates it.
  const planet = placement('planet', 0);
  await page.setContent(
    [0, 90, 330]
      .map(
        rotation =>
          `<div>${render(
            createElement(BattlefieldCanvas, {
              scene: { ...base, light: { x: 0, y: 200 }, placements: [{ ...planet, rotation }] },
            }),
          )}</div>`,
      )
      .join(''),
  );
  const rotationError = await page.evaluate(async () => {
    const samples: Uint8ClampedArray[] = [];
    for (const svg of document.querySelectorAll('div > svg')) {
      svg.setAttribute('width', '1600');
      svg.setAttribute('height', '400');
      const image = new Image();
      image.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 400;
      const context = canvas.getContext('2d')!;
      // Grain rotates with the surface; blur it to compare the broader shading.
      context.filter = 'blur(6px)';
      context.drawImage(image, 0, 0);
      samples.push(context.getImageData(760, 160, 80, 80).data);
    }
    let maximum = 0;
    for (const sample of samples.slice(1))
      for (let i = 0; i < sample.length; i++)
        maximum = Math.max(maximum, Math.abs(sample[i] - samples[0][i]));
    return maximum;
  });
  expect(
    rotationError,
    'Planet highlights stay pointed at the world-space source',
  ).toBeLessThanOrEqual(3);
  console.log('Shared lighting:', JSON.stringify(lighting));
  console.log(
    'PASS: every object follows the shared light; planet highlights survive rotation; all planets occlude ships; solid hulls and open gaps retain their opacity; the source never appears in saved artwork.',
  );
} finally {
  clearTimeout(timeout);
  await browser.close();
}
