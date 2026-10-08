import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  canNestBattlefieldLayer,
  type battlefieldLayerTree,
} from '../../../../../shared/battlefield/layers.ts';
import type { BattlefieldScene } from '../../../../../shared/types/battlefield.ts';

type DropTarget = {
  kind: 'layer' | 'object' | 'root';
  id: string;
  parentId: string | null;
  mode: 'inside' | 'relative';
  above: boolean;
  sourceKind: 'layer' | 'object';
};
type Drag = {
  kind: 'layer' | 'object';
  id: string;
  ids: string[];
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  moved: boolean;
  pointerId: number;
  target?: DropTarget;
};

export type BattlefieldLayerDragActions = {
  onSelect: (ids: string[], layerId: string, asLayer?: boolean) => void;
  onMove: (
    ids: string[],
    layerId: string,
    targetId?: string,
    above?: boolean,
    targetKind?: 'object' | 'layer',
  ) => void;
  onNestLayer: (id: string, parentId: string | null) => void;
  onReorderLayer: (
    id: string,
    targetId: string,
    above: boolean,
    targetKind: 'object' | 'layer',
  ) => void;
};

export function useBattlefieldLayerDrag({
  scene,
  tree,
  selected,
  selectedLayerId,
  onSelect,
  onMove,
  onNestLayer,
  onReorderLayer,
  onExpand,
}: BattlefieldLayerDragActions & {
  scene: BattlefieldScene;
  tree: ReturnType<typeof battlefieldLayerTree>;
  selected: string[];
  selectedLayerId?: string;
  onExpand: (id: string) => void;
}) {
  const [drop, setDrop] = useState<DropTarget>();
  const drag = useRef<Drag | undefined>(undefined);
  const scroll = useRef<HTMLDivElement>(null);
  const frame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const startDrag = (
    event: PointerEvent<HTMLButtonElement>,
    kind: Drag['kind'],
    id: string,
    layerId: string,
  ) => {
    if (event.button !== 0) return;
    const ids =
      kind === 'layer'
        ? tree.objects(id).map(p => p.id)
        : !selectedLayerId && selected.includes(id)
          ? selected
          : [id];
    onSelect(ids, layerId, kind === 'layer');
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind,
      id,
      ids,
      x: event.clientX,
      y: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
    };
  };
  const updateDrop = (clientX: number, clientY: number) => {
    const active = drag.current;
    const panel = scroll.current;
    if (!active || !panel) return;
    const row = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-layer-row]');
    let target: DropTarget | undefined;
    if (row && panel.contains(row)) {
      const { rowKind, rowId, parentId } = row.dataset;
      const bounds = row.getBoundingClientRect();
      const fraction = (clientY - bounds.top) / bounds.height;
      if (rowKind === 'root') {
        if (active.kind === 'layer')
          target = {
            kind: 'root',
            id: '',
            parentId: null,
            mode: 'inside',
            above: true,
            sourceKind: active.kind,
          };
      } else if ((rowKind === 'layer' || rowKind === 'object') && rowId) {
        const inside = rowKind === 'layer' && fraction >= 0.25 && fraction <= 0.75;
        target = {
          kind: rowKind,
          id: rowId,
          parentId: inside ? rowId : parentId || null,
          mode: inside ? 'inside' : 'relative',
          above: fraction < 0.5,
          sourceKind: active.kind,
        };
        if (
          active.kind === 'layer' &&
          (!canNestBattlefieldLayer(scene, active.id, target.parentId) ||
            (rowKind === 'layer' && rowId === active.id))
        )
          target = undefined;
        else if (
          active.kind === 'object' &&
          (target.parentId === null || (rowKind === 'object' && active.ids.includes(rowId)))
        )
          target = undefined;
      }
    }
    active.target = target;
    setDrop(previous =>
      previous?.id === target?.id &&
      previous?.kind === target?.kind &&
      previous?.mode === target?.mode &&
      previous?.above === target?.above &&
      previous?.sourceKind === target?.sourceKind
        ? previous
        : target,
    );
  };
  const autoScroll = () => {
    const active = drag.current;
    const panel = scroll.current;
    if (!active?.moved || !panel) {
      frame.current = undefined;
      return;
    }
    const bounds = panel.getBoundingClientRect();
    const within =
      active.clientX >= bounds.left &&
      active.clientX <= bounds.right &&
      active.clientY >= bounds.top &&
      active.clientY <= bounds.bottom;
    const delta = !within
      ? 0
      : active.clientY < bounds.top + 28
        ? -8
        : active.clientY > bounds.bottom - 28
          ? 8
          : 0;
    if (delta) {
      panel.scrollTop += delta;
      updateDrop(active.clientX, active.clientY);
    }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const moveDrag = (event: PointerEvent) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    active.clientX = event.clientX;
    active.clientY = event.clientY;
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) < 5 && !active.moved) return;
    active.moved = true;
    updateDrop(event.clientX, event.clientY);
    if (frame.current === undefined) frame.current = requestAnimationFrame(autoScroll);
  };
  const finishDrag = (event: PointerEvent, cancelled = false) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (!cancelled && active.moved && active.target) {
      const target = active.target;
      if (active.kind === 'layer') {
        if (target.mode === 'inside') onNestLayer(active.id, target.parentId);
        else if (target.kind !== 'root')
          onReorderLayer(active.id, target.id, target.above, target.kind);
      } else if (target.parentId !== null && target.kind !== 'root') {
        onMove(
          active.ids,
          target.parentId,
          target.mode === 'relative' ? target.id : undefined,
          target.above,
          target.kind,
        );
      }
      if (target.mode === 'inside' && target.parentId) onExpand(target.parentId);
    }
    drag.current = undefined;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    setDrop(undefined);
  };

  return { scroll, drop, startDrag, moveDrag, finishDrag };
}
