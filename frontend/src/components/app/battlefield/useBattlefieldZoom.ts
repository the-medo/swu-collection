import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function useBattlefieldZoom(
  canvasRef: RefObject<HTMLDivElement | null>,
  draggingRef: RefObject<object | null>,
) {
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const currentZoom = useRef(1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const anchor = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const pan = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setViewportWidth(element.getBoundingClientRect().width);
    });
    observer.observe(element, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);

  const zoomAt = useCallback(
    (value: number, clientX: number, clientY: number) => {
      const element = viewport.current;
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!element || !bounds?.width || !bounds.height || draggingRef.current || pan.current)
        return;
      const next = Math.max(1, Math.min(4, value));
      if (next === currentZoom.current) return;
      anchor.current = {
        x: (clientX - bounds.left) / bounds.width,
        y: (clientY - bounds.top) / bounds.height,
        clientX,
        clientY,
      };
      // Native scrollbars must not shrink the scene when zooming in.
      setViewportWidth(element.getBoundingClientRect().width);
      currentZoom.current = next;
      setZoom(next);
    },
    [canvasRef, draggingRef],
  );

  useLayoutEffect(() => {
    const element = viewport.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    const target = anchor.current;
    if (!element || !bounds || !target) return;
    // Reposition before paint, after scrollbar and toolbar layout changes.
    element.scrollLeft += bounds.left + target.x * bounds.width - target.clientX;
    element.scrollTop += bounds.top + target.y * bounds.height - target.clientY;
    anchor.current = null;
  }, [canvasRef, viewportWidth, zoom]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (draggingRef.current || pan.current) {
        event.preventDefault();
        return;
      }
      // Keep horizontal / Shift-wheel panning native to the scroll container.
      if (!event.deltaY || event.shiftKey) return;
      event.preventDefault();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      zoomAt(
        currentZoom.current * Math.exp(-event.deltaY * units * 0.0015),
        event.clientX,
        event.clientY,
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [draggingRef, zoomAt]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const finish = () => {
      const gesture = pan.current;
      if (!gesture) return;
      pan.current = null;
      setPanning(false);
      if (element.hasPointerCapture(gesture.pointerId))
        element.releasePointerCapture(gesture.pointerId);
    };
    const start = (event: PointerEvent) => {
      if (event.button !== 1 || draggingRef.current || pan.current) return;
      // Capture before object handlers and cancel the browser's middle-click autoscroll.
      event.preventDefault();
      event.stopPropagation();
      pan.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
      };
      element.setPointerCapture(event.pointerId);
      setPanning(true);
    };
    const move = (event: PointerEvent) => {
      const gesture = pan.current;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (!(event.buttons & 4)) return finish();
      element.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.clientX);
      element.scrollTop = gesture.scrollTop - (event.clientY - gesture.clientY);
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId !== pan.current?.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      finish();
    };
    const auxiliaryClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };
    element.addEventListener('pointerdown', start, true);
    element.addEventListener('pointermove', move, true);
    element.addEventListener('pointerup', end, true);
    element.addEventListener('pointercancel', end, true);
    element.addEventListener('lostpointercapture', end, true);
    element.addEventListener('auxclick', auxiliaryClick);
    window.addEventListener('blur', finish);
    return () => {
      element.removeEventListener('pointerdown', start, true);
      element.removeEventListener('pointermove', move, true);
      element.removeEventListener('pointerup', end, true);
      element.removeEventListener('pointercancel', end, true);
      element.removeEventListener('lostpointercapture', end, true);
      element.removeEventListener('auxclick', auxiliaryClick);
      window.removeEventListener('blur', finish);
      const gesture = pan.current;
      pan.current = null;
      if (gesture && element.hasPointerCapture(gesture.pointerId))
        element.releasePointerCapture(gesture.pointerId);
    };
  }, [draggingRef]);

  const toggleZoom = () => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (bounds)
      zoomAt(
        currentZoom.current > 1 ? 1 : 2,
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
  };

  return {
    viewport,
    zoom,
    panning,
    toggleZoom,
    canvasWidth: zoom === 1 || !viewportWidth ? '100%' : viewportWidth * zoom,
    pixelsPerUnit: viewportWidth ? (viewportWidth * zoom) / 1600 : 1,
  };
}
