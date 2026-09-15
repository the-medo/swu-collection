import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';

/** Inspection never shares the tap/click that submits a game action. */
export function useCardInspection(
  id: string | null,
  inspect: (id: string) => void,
  enabled = true,
) {
  const hold = useRef<{
    timer: ReturnType<typeof setTimeout>;
    pointer: number;
    x: number;
    y: number;
  } | null>(null);
  const consumed = useRef(false);
  const pointerType = useRef('');
  const clear = useCallback(() => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  }, []);
  useEffect(() => clear, [id, enabled, inspect, clear]);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      clear();
      consumed.current = false;
      pointerType.current = event.pointerType;
      if (!id || !enabled || !event.isPrimary || event.pointerType !== 'touch') return;
      event.currentTarget.setPointerCapture(event.pointerId);
      hold.current = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        timer: setTimeout(() => {
          hold.current = null;
          consumed.current = true;
          inspect(id);
        }, 1000),
      };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (consumed.current) event.stopPropagation();
      const current = hold.current;
      if (
        current &&
        current.pointer === event.pointerId &&
        Math.hypot(event.clientX - current.x, event.clientY - current.y) >= 8
      )
        clear();
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      clear();
      if (consumed.current) event.preventDefault();
    },
    onPointerCancel: clear,
    onLostPointerCapture: clear,
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (consumed.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      // Mobile browsers can emit contextmenu before the full one-second hold.
      if (pointerType.current === 'touch') return;
      clear();
      if (enabled && id) inspect(id);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      pointerType.current = 'keyboard';
      consumed.current = false;
      if (event.key.toLowerCase() === 'i' && id && enabled) {
        event.preventDefault();
        inspect(id);
      }
    },
  };
}
