import { battlefieldLayerRows } from '../../../../../shared/battlefield/layers.ts';
import {
  battlefieldDefaultLight,
  type BattlefieldScene,
  type BattlefieldFaction,
} from '../../../../../shared/types/battlefield.ts';

// PostgreSQL JSONB reorders object keys; compare scene values in a fixed order.
export const battlefieldFingerprint = (
  name: string,
  scene: BattlefieldScene,
  factions: BattlefieldFaction[] = [],
) =>
  JSON.stringify([
    name,
    scene.width,
    scene.height,
    scene.backgroundId,
    (scene.light ?? battlefieldDefaultLight).x,
    (scene.light ?? battlefieldDefaultLight).y,
    // Include all records so repairing an invalid or duplicate layer is a change,
    // even if that layer cannot currently appear in the tree.
    [...scene.layers]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(layer => [layer.id, layer.parentId, layer.name, layer.visible]),
    [...scene.placements]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(p => [
        p.id,
        p.itemId,
        p.x,
        p.y,
        p.rotation,
        p.scale,
        p.colorId,
        p.textureId ?? 'rocky',
        p.layerId,
        p.visible,
      ]),
    battlefieldLayerRows(scene).map(entry => [entry.kind, entry.id]),
    [...factions].sort(),
  ]);
