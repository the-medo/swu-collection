import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { battlefieldItems } from '../../../../../shared/battlefield/catalog.ts';
import type { BattlefieldScene } from '../../../../../shared/types/battlefield.ts';
import {
  battlefieldLayerTree,
  deleteBattlefieldLayer,
} from '../../../../../shared/battlefield/layers.ts';
import { BattlefieldThumbnail } from './BattlefieldThumbnail';
import {
  useBattlefieldLayerDrag,
  type BattlefieldLayerDragActions,
} from './useBattlefieldLayerDrag';

export function BattlefieldLayers({
  scene,
  selected,
  activeLayerId,
  selectedLayerId,
  onSelect,
  onChange,
  onCreate,
  onMove,
  onNestLayer,
  onReorderLayer,
}: BattlefieldLayerDragActions & {
  scene: BattlefieldScene;
  selected: string[];
  activeLayerId: string;
  selectedLayerId?: string;
  onChange: (scene: BattlefieldScene) => void;
  onCreate: (ids: string[], parentId: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [renaming, setRenaming] = useState<string>();
  const [layerName, setLayerName] = useState('');
  const tree = useMemo(() => battlefieldLayerTree(scene), [scene]);
  const rows = tree.rows(collapsed);
  const folders = tree.rows().filter(entry => entry.kind === 'layer');
  const rootCount = tree.children(null).length;
  const activeLayer = scene.layers.find(layer => layer.id === activeLayerId);
  const descendants = tree.subtree(activeLayerId);
  const expand = (id: string) =>
    setCollapsed(current => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  const { scroll, drop, startDrag, moveDrag, finishDrag } = useBattlefieldLayerDrag({
    scene,
    tree,
    selected,
    selectedLayerId,
    onSelect,
    onMove,
    onNestLayer,
    onReorderLayer,
    onExpand: expand,
  });
  const selectObject = (id: string, layerId: string, multiple: boolean) =>
    onSelect(
      multiple
        ? selected.includes(id)
          ? selected.filter(value => value !== id)
          : [...selected, id]
        : [id],
      layerId,
    );
  const saveName = () => {
    if (renaming && layerName.trim())
      onChange({
        ...scene,
        layers: scene.layers.map(layer =>
          layer.id === renaming ? { ...layer, name: layerName.trim() } : layer,
        ),
      });
    setRenaming(undefined);
  };
  const nudgeOrder = (forward: boolean) => {
    const single = selected.length === 1 && scene.placements.find(p => p.id === selected[0]);
    if (!single) return;
    const siblings = tree.children(single.layerId);
    const target =
      siblings[
        siblings.findIndex(entry => entry.kind === 'object' && entry.id === single.id) +
          (forward ? 1 : -1)
      ];
    if (target) onMove([single.id], single.layerId, target.id, forward, target.kind);
  };
  const keyboardOrder = (
    event: KeyboardEvent<HTMLButtonElement>,
    kind: 'layer' | 'object',
    id: string,
    layerId: string,
  ) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const forward = event.key === 'ArrowUp';
    const parentId =
      kind === 'layer' ? (scene.layers.find(layer => layer.id === id)?.parentId ?? null) : layerId;
    const siblings = tree.children(parentId);
    const target =
      siblings[
        siblings.findIndex(entry => entry.kind === kind && entry.id === id) + (forward ? 1 : -1)
      ];
    if (!target) return;
    if (kind === 'layer') onReorderLayer(id, target.id, forward, target.kind);
    else onMove([id], layerId, target.id, forward, target.kind);
  };
  const indicator = (kind: 'layer' | 'object' | 'root', id: string) =>
    drop?.kind === kind && drop.id === id
      ? drop.mode === 'inside'
        ? 'ring-2 ring-inset ring-primary'
        : drop.above
          ? 'border-t-2 border-t-primary'
          : 'border-b-2 border-b-primary'
      : '';

  return (
    <aside
      aria-label="Battlefield layers"
      className="order-3 min-w-0 border-t lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:border-t-0 lg:border-r"
    >
      <div className="flex h-[52px] items-center justify-between border-b px-3">
        <h2 className="m-0! text-xs! font-semibold! uppercase tracking-wider text-muted-foreground">
          Layers
        </h2>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Create layer"
          title="Create an empty top-level layer"
          onClick={() => onCreate([], null)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div
        ref={scroll}
        aria-label="Layers stack"
        className="max-h-80 overflow-auto overscroll-contain py-1 lg:max-h-[max(260px,calc(100dvh-320px))]"
        onPointerMove={moveDrag}
        onPointerUp={event => finishDrag(event)}
        onPointerCancel={event => finishDrag(event, true)}
        onLostPointerCapture={event => finishDrag(event, true)}
      >
        {rows.map(entry => {
          const indent = { paddingLeft: 4 + entry.depth * 12, minWidth: 205 + entry.depth * 12 };
          if (entry.kind === 'layer') {
            const layer = entry.layer;
            const members = tree.objects(layer.id);
            const closed = collapsed.has(layer.id);
            return (
              <div
                key={'layer:' + layer.id}
                data-layer-row
                data-row-kind="layer"
                data-row-id={layer.id}
                data-layer-id={layer.id}
                data-parent-id={layer.parentId ?? ''}
                style={indent}
                className={`group flex min-h-9 items-center gap-0.5 pr-1 ${activeLayerId === layer.id ? 'bg-primary/10' : 'bg-muted/30'} ${entry.visible ? '' : 'opacity-50'} ${indicator('layer', layer.id)}`}
              >
                <button
                  type="button"
                  aria-label={'Drag layer ' + layer.name}
                  className="shrink-0 touch-none cursor-grab p-0.5 text-muted-foreground"
                  onPointerDown={event => startDrag(event, 'layer', layer.id, layer.id)}
                  onKeyDown={event => keyboardOrder(event, 'layer', layer.id, layer.id)}
                  aria-keyshortcuts="ArrowUp ArrowDown"
                  title="Drag into a layer to nest, or to a row edge to reorder"
                >
                  <GripVertical className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={(closed ? 'Expand ' : 'Collapse ') + layer.name}
                  className="shrink-0 p-0.5"
                  onClick={() =>
                    setCollapsed(current => {
                      const next = new Set(current);
                      if (next.has(layer.id)) next.delete(layer.id);
                      else next.add(layer.id);
                      return next;
                    })
                  }
                >
                  {closed ? (
                    <ChevronRight className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </button>
                <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                {renaming === layer.id ? (
                  <Input
                    autoFocus
                    aria-label="Layer name"
                    className="h-7 min-w-0 px-1 text-xs"
                    maxLength={80}
                    value={layerName}
                    onChange={event => setLayerName(event.target.value)}
                    onBlur={saveName}
                    onKeyDown={event => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape') setRenaming(undefined);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    aria-label={'Select layer ' + layer.name}
                    aria-pressed={selectedLayerId === layer.id}
                    className="min-w-0 flex-1 truncate px-1 py-2 text-left text-xs font-medium"
                    title={layer.name + ' · ' + members.length + ' objects'}
                    onClick={() =>
                      onSelect(
                        members.map(p => p.id),
                        layer.id,
                        true,
                      )
                    }
                  >
                    {layer.name}
                  </button>
                )}
                <button
                  type="button"
                  className="shrink-0 p-1 text-muted-foreground"
                  aria-label={'Create sublayer in ' + layer.name}
                  title="Create a sublayer"
                  onClick={() => {
                    expand(layer.id);
                    onCreate([], layer.id);
                  }}
                >
                  <Plus className="size-3" />
                </button>
                <button
                  type="button"
                  className="shrink-0 p-1 text-muted-foreground"
                  aria-label={'Rename layer ' + layer.name}
                  onClick={() => {
                    setLayerName(layer.name);
                    setRenaming(layer.id);
                  }}
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  className="shrink-0 p-1"
                  aria-label={(layer.visible ? 'Hide layer ' : 'Show layer ') + layer.name}
                  onClick={() =>
                    onChange({
                      ...scene,
                      layers: scene.layers.map(value =>
                        value.id === layer.id ? { ...value, visible: !value.visible } : value,
                      ),
                    })
                  }
                >
                  {layer.visible ? (
                    <Eye className="size-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                </button>
                {(layer.parentId !== null || rootCount > 1) && (
                  <button
                    type="button"
                    className="shrink-0 p-1 text-muted-foreground"
                    aria-label={'Delete layer ' + layer.name}
                    title={
                      layer.parentId
                        ? 'Delete this layer and move its contents to its parent'
                        : 'Delete this layer and merge its contents with the neighboring layer'
                    }
                    onClick={() => {
                      const next = deleteBattlefieldLayer(scene, layer.id);
                      onChange(next);
                      if (activeLayerId === layer.id)
                        onSelect(
                          selected,
                          layer.parentId ??
                            next.placements.find(p => selected.includes(p.id))?.layerId ??
                            next.layers.find(value => value.parentId === null)!.id,
                        );
                    }}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          }
          const placement = entry.placement;
          const item = battlefieldItems[placement.itemId];
          return (
            <div
              key={'object:' + placement.id}
              data-layer-row
              data-row-kind="object"
              data-row-id={placement.id}
              data-layer-id={placement.layerId}
              data-parent-id={placement.layerId}
              style={indent}
              className={`flex min-h-10 items-center gap-1 pr-2 ${selected.includes(placement.id) ? 'bg-primary/15' : 'hover:bg-muted/40'} ${entry.visible ? '' : 'opacity-50'} ${indicator('object', placement.id)}`}
            >
              <button
                type="button"
                aria-label={'Drag ' + (item?.name ?? 'object')}
                className="shrink-0 touch-none cursor-grab text-muted-foreground"
                onPointerDown={event => startDrag(event, 'object', placement.id, placement.layerId)}
                onKeyDown={event => keyboardOrder(event, 'object', placement.id, placement.layerId)}
                aria-keyshortcuts="ArrowUp ArrowDown"
                title="Drag or use arrow keys to reorder this object"
              >
                <GripVertical className="size-3" />
              </button>
              {item && (
                <BattlefieldThumbnail
                  item={item}
                  color={battlefieldItems[placement.colorId]?.color}
                  className="h-7 w-8 shrink-0"
                />
              )}
              <button
                type="button"
                aria-label={'Select object ' + (item?.name ?? 'Unavailable object')}
                aria-pressed={selected.includes(placement.id)}
                className="min-w-0 flex-1 truncate py-2 text-left text-xs"
                title={item?.name}
                onClick={event =>
                  selectObject(
                    placement.id,
                    placement.layerId,
                    event.shiftKey || event.ctrlKey || event.metaKey,
                  )
                }
              >
                {item?.name ?? 'Unavailable object'}
              </button>
              <button
                type="button"
                aria-label={(placement.visible ? 'Hide ' : 'Show ') + (item?.name ?? 'object')}
                className="shrink-0 p-1"
                onClick={() =>
                  onChange({
                    ...scene,
                    placements: scene.placements.map(p =>
                      p.id === placement.id ? { ...p, visible: !p.visible } : p,
                    ),
                  })
                }
              >
                {placement.visible ? (
                  <Eye className="size-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </button>
            </div>
          );
        })}
        <div
          data-layer-row
          data-row-kind="root"
          className={`mx-1 mt-1 rounded border border-dashed px-2 py-3 text-center text-xs text-muted-foreground ${indicator('root', '')}`}
          title="Drop a layer here to move it to the top level"
        >
          Top level
        </div>
      </div>
      <div className="grid gap-2 border-t p-3 text-xs text-muted-foreground">
        {activeLayer && (
          <label className="grid gap-1.5">
            Layer parent
            <select
              aria-label="Layer parent"
              className="h-8 min-w-0 rounded-md border bg-background px-2 text-foreground"
              value={activeLayer.parentId ?? ''}
              onChange={event => {
                const parentId = event.target.value || null;
                if (parentId) expand(parentId);
                onNestLayer(activeLayer.id, parentId);
              }}
            >
              <option value="">Top level</option>
              {folders
                .filter(entry => !descendants.has(entry.id))
                .map(entry => (
                  <option key={entry.id} value={entry.id}>
                    {'› '.repeat(entry.depth) + entry.layer.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {selected.length > 0 && !selectedLayerId && (
          <label className="grid gap-1.5">
            Move selection to layer
            <select
              aria-label="Selection layer"
              className="h-8 min-w-0 rounded-md border bg-background px-2 text-foreground"
              value={
                scene.placements
                  .filter(p => selected.includes(p.id))
                  .every(p => p.layerId === activeLayerId)
                  ? activeLayerId
                  : ''
              }
              onChange={event => {
                expand(event.target.value);
                onMove(selected, event.target.value);
              }}
            >
              <option value="" disabled>
                Mixed layers
              </option>
              {folders.map(entry => (
                <option key={entry.id} value={entry.id}>
                  {'› '.repeat(entry.depth) + entry.layer.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {selected.length === 1 && !selectedLayerId && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 flex-1 text-xs"
              onClick={() => nudgeOrder(true)}
              aria-label="Move object forward"
            >
              <ArrowUp className="size-3" />
              Forward
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 flex-1 text-xs"
              onClick={() => nudgeOrder(false)}
              aria-label="Move object backward"
            >
              <ArrowDown className="size-3" />
              Back
            </Button>
          </div>
        )}
        <p>
          Top rows appear in front. Drop onto a layer to nest; drop at a row edge to reorder. Select
          a layer to move all its objects and sublayers together.
        </p>
      </div>
    </aside>
  );
}
