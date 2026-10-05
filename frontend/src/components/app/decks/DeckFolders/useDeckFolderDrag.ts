import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { usePositionDeckFolder } from '@/api/deck-folders/usePositionDeckFolder.ts';
import { getDeckFolderDescendants } from '../../../../../../shared/lib/deckFolders.ts';
import type { DeckFolder, DeckFolderPositionRequest } from '../../../../../../types/DeckFolder.ts';

type Drag = { id: string; drop: DeckFolderPositionRequest | null };
type FocusRequest = {
  id: string;
  original: HTMLButtonElement | null;
  ready: boolean;
  drop: DeckFolderPositionRequest | null;
  parentId?: string | null;
};

function isPlacementCurrent(
  folders: DeckFolder[],
  id: string,
  drop: DeckFolderPositionRequest,
  expectedParentId?: string | null,
) {
  const moving = folders.find(folder => folder.id === id);
  const target = folders.find(folder => folder.id === drop.targetId);
  if (!moving || (drop.targetId && !target)) return false;
  const parentId =
    expectedParentId === undefined
      ? target
        ? drop.placement === 'inside'
          ? target.id
          : target.parentId
        : null
      : expectedParentId;
  if (moving.parentId !== parentId) return false;
  const siblings = folders.filter(folder => folder.parentId === parentId);
  const index = siblings.findIndex(folder => folder.id === id);
  const targetIndex = siblings.findIndex(folder => folder.id === drop.targetId);
  return (
    (drop.placement === 'inside' && index === siblings.length - 1) ||
    (drop.placement === 'before' && index === targetIndex - 1) ||
    (drop.placement === 'after' && index === targetIndex + 1)
  );
}

function positionPreview(element: HTMLDivElement | null, point: { x: number; y: number }) {
  if (!element) return;
  element.style.left = `${Math.max(8, Math.min(point.x + 12, innerWidth - 328))}px`;
  element.style.top = `${point.y + 16}px`;
}

export function useDeckFolderDrag(
  folders: DeckFolder[],
  onPositioned: (id: string, parentId: string | null) => void,
) {
  const move = usePositionDeckFolder();
  const [drag, setDrag] = useState<Drag | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const focusRequest = useRef<FocusRequest | null>(null);
  const [, checkFocus] = useState(0);
  const pointer = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    activated: boolean;
    scrollContainer: HTMLElement;
  } | null>(null);
  const attachPreview = useCallback((element: HTMLDivElement | null) => {
    previewRef.current = element;
    if (element && pointer.current?.activated) positionPreview(element, pointer.current);
  }, []);

  const getDrop = useCallback(
    (id: string, x: number, y: number): DeckFolderPositionRequest | null => {
      const element = document.elementFromPoint(x, y);
      if (element?.closest('[data-folder-drop-root]'))
        return { targetId: null, placement: 'inside' };
      const row = element?.closest<HTMLElement>('[data-folder-drop-row]');
      const targetId = row?.dataset.folderDropRow;
      const blocked = getDeckFolderDescendants(folders, id);
      if (!row || !targetId || blocked.has(targetId)) return null;
      const bounds = row.getBoundingClientRect();
      const relativeY = (y - bounds.top) / bounds.height;
      // The gap below an expanded parent is before its first child, not after its subtree.
      if (relativeY > 0.75 && row.querySelector('[data-folder-toggle][aria-expanded="true"]')) {
        const child = folders.find(
          folder => folder.parentId === targetId && !blocked.has(folder.id),
        );
        return child
          ? { targetId: child.id, placement: 'before' }
          : { targetId, placement: 'inside' };
      }
      return {
        targetId,
        placement: relativeY < 0.25 ? 'before' : relativeY > 0.75 ? 'after' : 'inside',
      };
    },
    [folders],
  );
  const cancel = useCallback(() => {
    pointer.current = null;
    setDrag(null);
  }, []);
  const updateDrop = useCallback((id: string, drop: DeckFolderPositionRequest | null) => {
    setDrag(current =>
      current?.id === id &&
      current.drop?.targetId === drop?.targetId &&
      current.drop?.placement === drop?.placement
        ? current
        : { id, drop },
    );
  }, []);
  const position = async (id: string, drop: DeckFolderPositionRequest) => {
    if (isPlacementCurrent(folders, id, drop)) return;
    const handle = document.querySelector<HTMLButtonElement>(
      `[data-folder-drop-row="${id}"] button`,
    );
    const request: FocusRequest | null =
      document.activeElement === handle ? { id, original: handle, ready: false, drop: null } : null;
    focusRequest.current = request;
    try {
      const result = await move.mutateAsync({ id, ...drop });
      if (request) {
        request.drop = drop;
        request.parentId = result.parentId;
      }
      onPositioned(result.id, result.parentId ?? null);
    } catch {
      // The mutation reports the error; the saved tree remains unchanged.
    } finally {
      if (request && focusRequest.current === request) {
        request.ready = true;
        checkFocus(version => version + 1);
      }
    }
  };

  // Wait for the refetched tree and revealed parent to commit before restoring the handle.
  useLayoutEffect(() => {
    const request = focusRequest.current;
    if (!request?.ready || move.isPending) return;
    const handle = document.querySelector<HTMLButtonElement>(
      `[data-folder-drop-row="${request.id}"] button`,
    );
    const active = document.activeElement;
    if (active !== document.body && active !== request.original && active !== handle) {
      focusRequest.current = null;
      return;
    }
    if (!folders.some(folder => folder.id === request.id)) {
      focusRequest.current = null;
      return;
    }
    if (request.drop && !isPlacementCurrent(folders, request.id, request.drop, request.parentId))
      return;
    if (!handle) return;
    handle.focus({ preventScroll: true });
    focusRequest.current = null;
  });

  const draggingId = drag?.id;
  useEffect(() => {
    if (!draggingId) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onEscape);
    let frame: number;
    const scroll = () => {
      const point = pointer.current;
      if (point) {
        const bounds = point.scrollContainer.getBoundingClientRect();
        const delta =
          point.y < Math.max(0, bounds.top) + 64
            ? -14
            : point.y > Math.min(innerHeight, bounds.bottom) - 64
              ? 14
              : 0;
        if (delta) {
          const previousTop = point.scrollContainer.scrollTop;
          point.scrollContainer.scrollBy(0, delta);
          if (point.scrollContainer.scrollTop !== previousTop)
            updateDrop(point.id, getDrop(point.id, point.x, point.y));
        }
        positionPreview(previewRef.current, point);
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onEscape);
    };
  }, [draggingId, getDrop, cancel, updateDrop]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0 || !event.isPrimary || pointer.current || move.isPending) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = {
      id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      activated: false,
      scrollContainer: event.currentTarget.closest<HTMLElement>('main') ?? document.documentElement,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = pointer.current;
    if (!active || event.pointerId !== active.pointerId) return;
    active.x = event.clientX;
    active.y = event.clientY;
    if (!active.activated && Math.hypot(active.x - active.startX, active.y - active.startY) < 6)
      return;
    active.activated = true;
    updateDrop(active.id, getDrop(active.id, active.x, active.y));
    positionPreview(previewRef.current, active);
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const active = pointer.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const drop = active.activated ? getDrop(active.id, event.clientX, event.clientY) : null;
    cancel();
    if (drop) void position(active.id, drop);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === 'Escape' && pointer.current) {
      cancel();
      return;
    }
    if (
      !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    if (move.isPending || pointer.current) {
      event.preventDefault();
      return;
    }
    const folder = folders.find(item => item.id === id);
    if (!folder) return;
    const siblings = folders.filter(item => item.parentId === folder.parentId);
    const index = siblings.findIndex(item => item.id === id);
    let drop: DeckFolderPositionRequest | undefined;
    if (event.key === 'ArrowUp' && index > 0)
      drop = { targetId: siblings[index - 1].id, placement: 'before' };
    if (event.key === 'ArrowDown' && index < siblings.length - 1)
      drop = { targetId: siblings[index + 1].id, placement: 'after' };
    if (event.key === 'ArrowRight' && index > 0)
      drop = { targetId: siblings[index - 1].id, placement: 'inside' };
    if (event.key === 'ArrowLeft' && folder.parentId)
      drop = { targetId: folder.parentId, placement: 'after' };
    if (event.key.startsWith('Arrow')) event.preventDefault();
    if (drop) void position(id, drop);
  };

  const source = folders.find(folder => folder.id === drag?.id);
  const target = folders.find(folder => folder.id === drag?.drop?.targetId);
  const description = drag?.drop
    ? target
      ? `Move ${source?.name} ${drag.drop.placement} ${target.name}`
      : `Move ${source?.name} to the top level`
    : `Drag ${source?.name ?? 'a folder'} between rows to reorder, or onto a row to nest it`;
  return {
    drag,
    attachPreview,
    description,
    isPending: move.isPending,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    cancel,
  };
}

export type DeckFolderDrag = Omit<ReturnType<typeof useDeckFolderDrag>, 'attachPreview'>;
