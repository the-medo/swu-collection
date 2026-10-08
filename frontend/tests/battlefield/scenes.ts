import {
  defaultBattlefieldScene,
  type BattlefieldPlacement,
  type BattlefieldScene,
} from '../../../shared/types/battlefield.ts';

function object(
  itemId: string,
  layerId: string,
  order: number,
  x: number,
  y: number,
): BattlefieldPlacement {
  return {
    id: crypto.randomUUID(),
    itemId,
    layerId,
    order,
    x,
    y,
    rotation: 0,
    scale: 1,
    colorId: 'color-default',
    visible: true,
    ...(itemId === 'planet' ? { textureId: 'rocky' } : {}),
  };
}

// A small formation inside a Scene sublayer, independent of previous UI actions.
export function formationScene(): BattlefieldScene {
  const scene = defaultBattlefieldScene();
  const layerId = crypto.randomUUID();
  scene.layers.push({
    id: layerId,
    name: 'Layer 2',
    parentId: scene.layers[0].id,
    order: 0,
    visible: true,
  });
  scene.placements = [
    object('ship-tie', layerId, 0, 300, 90),
    object('ship-tie', layerId, 1, 420, 110),
    object('ship-x-wing', layerId, 2, 540, 130),
  ].map(placement => ({ ...placement, rotation: 45 }));
  return scene;
}

// The twelve-object, 100,150-credit layout used by ordering, budget and responsive cases.
export function fleetScene(): BattlefieldScene {
  const scene = formationScene();
  const layerId = scene.layers[1].id;
  scene.backgroundId = 'background-nebula';
  scene.placements.push(
    object('asteroid-rock', layerId, 3, 620, 220),
    { ...object('addon-mining', layerId, 4, 632, 232), colorId: 'color-gold' },
    { ...object('planet', layerId, 5, 850, 200), textureId: 'ocean', scale: 1.5, rotation: 91 },
    object('addon-city', layerId, 6, 866, 211),
    { ...object('addon-ion', layerId, 7, 875, 180), colorId: 'color-gold' },
    object('ship-executor', layerId, 8, 1180, 90),
    object('ship-home-one', layerId, 9, 450, 250),
    object('ship-chimaera', layerId, 10, 1280, 270),
    object('station-orbital', layerId, 11, 360, 280),
  );
  return scene;
}

export function homeOneScene(): BattlefieldScene {
  const scene = defaultBattlefieldScene();
  scene.placements = [object('ship-home-one', scene.layers[0].id, 0, 300, 130)];
  return scene;
}
