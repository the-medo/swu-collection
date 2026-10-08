import {
  defaultBattlefieldScene,
  type BattlefieldLayer,
  type BattlefieldPlacement,
  type BattlefieldScene,
} from '../types/battlefield.ts';

export type BattlefieldStackEntry =
  | { kind: 'layer'; id: string; parentId: string | null; order: number; layer: BattlefieldLayer }
  | {
      kind: 'object';
      id: string;
      parentId: string;
      order: number;
      placement: BattlefieldPlacement;
    };

export type BattlefieldLayerRow = BattlefieldStackEntry & { depth: number; visible: boolean };

// Build the mixed sibling stacks once. The editor reuses this index for rows,
// folder members and ancestry, including during drag and slider previews.
export function battlefieldLayerTree(scene: BattlefieldScene) {
  const stacks = new Map<string | null, BattlefieldStackEntry[]>();
  const add = (entry: BattlefieldStackEntry) => {
    const stack = stacks.get(entry.parentId) ?? [];
    stack.push(entry);
    stacks.set(entry.parentId, stack);
  };
  // Equal order values retain array order, with direct objects before folders.
  for (const p of scene.placements)
    add({ kind: 'object', id: p.id, parentId: p.layerId, order: p.order, placement: p });
  for (const layer of scene.layers)
    add({ kind: 'layer', id: layer.id, parentId: layer.parentId, order: layer.order, layer });
  for (const stack of stacks.values()) stack.sort((a, b) => a.order - b.order);
  const children = (parentId: string | null) => stacks.get(parentId) ?? [];
  const subtrees = new Map<string, Set<string>>();
  const members = new Map<string, BattlefieldPlacement[]>();
  const subtree = (id: string) => {
    const cached = subtrees.get(id);
    if (cached) return cached;
    const ids = new Set<string>(),
      pending = [id];
    while (pending.length) {
      const current = pending.pop()!;
      if (ids.has(current)) continue;
      ids.add(current);
      for (const entry of children(current)) if (entry.kind === 'layer') pending.push(entry.id);
    }
    subtrees.set(id, ids);
    return ids;
  };
  const objects = (id: string) => {
    const cached = members.get(id);
    if (cached) return cached;
    const layers = subtree(id);
    const result = scene.placements.filter(p => layers.has(p.layerId));
    members.set(id, result);
    return result;
  };
  const rows = (collapsed = new Set<string>()) => {
    const result: BattlefieldLayerRow[] = [],
      seen = new Set<string>();
    const visit = (parentId: string | null, depth: number, ancestorsVisible: boolean) => {
      for (const entry of [...children(parentId)].reverse()) {
        if (entry.kind === 'object')
          result.push({ ...entry, depth, visible: ancestorsVisible && entry.placement.visible });
        else if (!seen.has(entry.id)) {
          seen.add(entry.id);
          const visible = ancestorsVisible && entry.layer.visible;
          result.push({ ...entry, depth, visible });
          if (!collapsed.has(entry.id)) visit(entry.id, depth + 1, visible);
        }
      }
    };
    visit(null, 0, true);
    return result;
  };
  return { children, subtree, objects, rows };
}

export function battlefieldChildren(scene: BattlefieldScene, parentId: string | null) {
  return battlefieldLayerTree(scene).children(parentId);
}

export function battlefieldLayerIssue(scene: BattlefieldScene): string | undefined {
  const layers = new Map<string, BattlefieldLayer>();
  for (const layer of scene.layers) {
    if (layers.has(layer.id)) return 'Each layer must have a unique ID.';
    layers.set(layer.id, layer);
  }
  const visited = new Set<string>();
  for (const layer of scene.layers) {
    const path = new Set<string>();
    let current: BattlefieldLayer | undefined = layer;
    while (current && !visited.has(current.id)) {
      if (path.has(current.id)) return 'Layers cannot contain themselves or their ancestors.';
      path.add(current.id);
      if (current.parentId === null) break;
      const parent = layers.get(current.parentId);
      if (!parent) return 'Every sublayer must have an existing parent layer.';
      current = parent;
    }
    for (const id of path) visited.add(id);
  }
}

export function battlefieldLayerSubtree(scene: BattlefieldScene, id: string) {
  return battlefieldLayerTree(scene).subtree(id);
}

export function battlefieldLayerObjects(scene: BattlefieldScene, id: string) {
  return battlefieldLayerTree(scene).objects(id);
}

export function canNestBattlefieldLayer(
  scene: BattlefieldScene,
  id: string,
  parentId: string | null,
) {
  return (
    scene.layers.some(layer => layer.id === id) &&
    (parentId === null ||
      (scene.layers.some(layer => layer.id === parentId) &&
        !battlefieldLayerSubtree(scene, id).has(parentId)))
  );
}

export function battlefieldLayerRows(scene: BattlefieldScene, collapsed = new Set<string>()) {
  return battlefieldLayerTree(scene).rows(collapsed);
}

// SVG paints from back to front. Visibility is inherited from all ancestors;
// hiding a folder never changes the child eye settings or the credit budget.
export function battlefieldDrawOrder(scene: BattlefieldScene, visibleOnly = false) {
  const tree = battlefieldLayerTree(scene);
  const placements: BattlefieldPlacement[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null) => {
    for (const entry of tree.children(parentId)) {
      if (entry.kind === 'object') {
        if (!visibleOnly || entry.placement.visible) placements.push(entry.placement);
      } else if (!seen.has(entry.id) && (!visibleOnly || entry.layer.visible)) {
        seen.add(entry.id);
        visit(entry.id);
      }
    }
  };
  visit(null);
  return placements;
}

// Reindex one sibling stack after structural edits. World-space geometry is
// unchanged when an object or an entire layer tree changes parent.
function setStack(scene: BattlefieldScene, entries: BattlefieldStackEntry[]): BattlefieldScene {
  const layers = new Map(
    entries.filter(entry => entry.kind === 'layer').map(entry => [entry.id, entry]),
  );
  const objects = new Map(
    entries.filter(entry => entry.kind === 'object').map(entry => [entry.id, entry]),
  );
  const order = new Map(entries.map((entry, i) => [entry.kind + ':' + entry.id, i]));
  return {
    ...scene,
    layers: scene.layers.map(layer =>
      layers.has(layer.id)
        ? {
            ...layer,
            parentId: layers.get(layer.id)!.parentId,
            order: order.get('layer:' + layer.id)!,
          }
        : layer,
    ),
    placements: scene.placements.map(p =>
      objects.has(p.id)
        ? { ...p, layerId: objects.get(p.id)!.parentId, order: order.get('object:' + p.id)! }
        : p,
    ),
  };
}

export function moveBattlefieldObjects(
  scene: BattlefieldScene,
  ids: string[],
  layerId: string,
  targetId?: string,
  above = true,
  targetKind: 'object' | 'layer' = 'object',
): BattlefieldScene {
  if (!scene.layers.some(layer => layer.id === layerId)) return scene;
  if (targetKind === 'object' && targetId && ids.includes(targetId)) return scene;
  const moving: BattlefieldStackEntry[] = battlefieldDrawOrder(scene)
    .filter(p => ids.includes(p.id))
    .map(p => ({ kind: 'object', id: p.id, parentId: layerId, order: p.order, placement: p }));
  if (!moving.length) return scene;
  const remaining = battlefieldChildren(scene, layerId).filter(
    entry => entry.kind !== 'object' || !ids.includes(entry.id),
  );
  const target = remaining.findIndex(entry => entry.id === targetId && entry.kind === targetKind);
  const index = target < 0 ? remaining.length : target + (above ? 1 : 0);
  remaining.splice(index, 0, ...moving);
  return setStack(scene, remaining);
}

export function nestBattlefieldLayer(
  scene: BattlefieldScene,
  id: string,
  parentId: string | null,
): BattlefieldScene {
  if (!canNestBattlefieldLayer(scene, id, parentId)) return scene;
  const layer = scene.layers.find(value => value.id === id)!;
  const entries = battlefieldChildren(scene, parentId).filter(
    entry => entry.kind !== 'layer' || entry.id !== id,
  );
  entries.push({ kind: 'layer', id, parentId, order: layer.order, layer });
  return setStack(scene, entries);
}

// A new folder replaces the stack position of its contents. Wrapping a selected
// folder keeps its entire hierarchy and inherited eye settings intact.
export function createBattlefieldLayer(
  scene: BattlefieldScene,
  layer: BattlefieldLayer,
  ids: string[] = [],
  wrapId?: string,
): BattlefieldScene {
  if (scene.layers.some(value => value.id === layer.id)) return scene;
  const wrap = wrapId ? scene.layers.find(value => value.id === wrapId) : undefined;
  if (wrapId && !wrap) return scene;
  const frontmost = [...battlefieldDrawOrder(scene)].reverse().find(p => ids.includes(p.id));
  const parentId = wrap ? wrap.parentId : (frontmost?.layerId ?? layer.parentId);
  if (parentId !== null && !scene.layers.some(value => value.id === parentId)) return scene;
  const siblings = battlefieldChildren(scene, parentId);
  const anchor = wrap
    ? siblings.find(entry => entry.kind === 'layer' && entry.id === wrap.id)
    : [...siblings].reverse().find(entry => entry.kind === 'object' && ids.includes(entry.id));
  let result: BattlefieldScene = { ...scene, layers: [...scene.layers, { ...layer, parentId }] };
  result = anchor
    ? reorderBattlefieldLayer(result, layer.id, anchor.id, true, anchor.kind)
    : nestBattlefieldLayer(result, layer.id, parentId);
  return wrap
    ? nestBattlefieldLayer(result, wrap.id, layer.id)
    : moveBattlefieldObjects(result, ids, layer.id);
}

export function reorderBattlefieldLayer(
  scene: BattlefieldScene,
  id: string,
  targetId: string,
  above: boolean,
  targetKind: 'layer' | 'object' = 'layer',
): BattlefieldScene {
  if (targetKind === 'layer' && id === targetId) return scene;
  const target =
    targetKind === 'layer'
      ? scene.layers.find(layer => layer.id === targetId)
      : scene.placements.find(p => p.id === targetId);
  if (!target) return scene;
  const parentId =
    targetKind === 'layer'
      ? (target as BattlefieldLayer).parentId
      : (target as BattlefieldPlacement).layerId;
  if (!canNestBattlefieldLayer(scene, id, parentId)) return scene;
  const layer = scene.layers.find(value => value.id === id)!;
  const entries = battlefieldChildren(scene, parentId).filter(
    entry => entry.kind !== 'layer' || entry.id !== id,
  );
  const index =
    entries.findIndex(entry => entry.kind === targetKind && entry.id === targetId) +
    (above ? 1 : 0);
  entries.splice(index, 0, { kind: 'layer', id, parentId, order: layer.order, layer });
  return setStack(scene, entries);
}

export function bringBattlefieldSelection(scene: BattlefieldScene, ids: string[], front: boolean) {
  let result = scene;
  const parents = new Set(scene.placements.filter(p => ids.includes(p.id)).map(p => p.layerId));
  for (const parentId of parents) {
    const entries = battlefieldChildren(result, parentId);
    const moving = entries.filter(entry => entry.kind === 'object' && ids.includes(entry.id));
    const remaining = entries.filter(entry => entry.kind !== 'object' || !ids.includes(entry.id));
    result = setStack(result, front ? [...remaining, ...moving] : [...moving, ...remaining]);
  }
  return result;
}

export function bringBattlefieldLayer(scene: BattlefieldScene, id: string, front: boolean) {
  const layer = scene.layers.find(value => value.id === id);
  if (!layer) return scene;
  const siblings = battlefieldChildren(scene, layer.parentId);
  const target = front ? siblings.at(-1) : siblings[0];
  return target ? reorderBattlefieldLayer(scene, id, target.id, front, target.kind) : scene;
}

export function publicBattlefieldScene(scene: BattlefieldScene): BattlefieldScene {
  const publicScene = defaultBattlefieldScene();
  return {
    ...publicScene,
    backgroundId: scene.backgroundId,
    light: { ...scene.light },
    placements: battlefieldDrawOrder(scene, true).map((p, order) => ({
      ...p,
      layerId: publicScene.layers[0].id,
      visible: true,
      order,
    })),
  };
}

export function canDeleteBattlefieldLayer(scene: BattlefieldScene, id: string) {
  const layer = scene.layers.find(value => value.id === id);
  return (
    !!layer &&
    (layer.parentId !== null || scene.layers.filter(value => value.parentId === null).length > 1)
  );
}

// Deleting a sublayer unwraps its direct children into its parent at the same
// stack position. Root layers merge with a neighboring root because objects
// always belong to a layer. Promote visibility without exposing hidden work.
export function deleteBattlefieldLayer(scene: BattlefieldScene, id: string): BattlefieldScene {
  if (!canDeleteBattlefieldLayer(scene, id)) return scene;
  const removed = scene.layers.find(layer => layer.id === id)!;
  let result: BattlefieldScene = {
    ...scene,
    layers: scene.layers.filter(layer => layer.id !== id),
  };
  const children = battlefieldChildren(scene, id).map(entry =>
    entry.kind === 'layer'
      ? { ...entry, layer: { ...entry.layer, visible: entry.layer.visible && removed.visible } }
      : {
          ...entry,
          placement: { ...entry.placement, visible: entry.placement.visible && removed.visible },
        },
  );
  let entries: BattlefieldStackEntry[];
  if (removed.parentId !== null) {
    const siblings = battlefieldChildren(scene, removed.parentId);
    const index = siblings.findIndex(entry => entry.kind === 'layer' && entry.id === id);
    entries = [
      ...siblings.slice(0, index),
      ...children.map(entry => ({ ...entry, parentId: removed.parentId! })),
      ...siblings.slice(index + 1),
    ];
  } else {
    const roots = battlefieldChildren(scene, null);
    const index = roots.findIndex(entry => entry.id === id);
    const target = roots[index > 0 ? index - 1 : index + 1];
    if (target.kind !== 'layer') return scene;
    const siblings = battlefieldChildren(scene, target.id).map(entry =>
      entry.kind === 'layer'
        ? {
            ...entry,
            layer: { ...entry.layer, visible: entry.layer.visible && target.layer.visible },
          }
        : {
            ...entry,
            placement: {
              ...entry.placement,
              visible: entry.placement.visible && target.layer.visible,
            },
          },
    );
    const contents = children.map(entry => ({ ...entry, parentId: target.id }));
    entries = index > 0 ? [...siblings, ...contents] : [...contents, ...siblings];
    result = {
      ...result,
      layers: result.layers.map(layer =>
        layer.id === target.id ? { ...layer, visible: layer.visible || removed.visible } : layer,
      ),
    };
  }
  result = {
    ...result,
    layers: result.layers.map(layer => {
      const entry = entries.find(value => value.kind === 'layer' && value.id === layer.id);
      return entry?.kind === 'layer' ? { ...layer, visible: entry.layer.visible } : layer;
    }),
    placements: result.placements.map(p => {
      const entry = entries.find(value => value.kind === 'object' && value.id === p.id);
      return entry?.kind === 'object' ? { ...p, visible: entry.placement.visible } : p;
    }),
  };
  return setStack(result, entries);
}
