import { useLayoutEffect, useRef } from 'react';

// Portaled notifications and existing viewport-sized panels also need the space
// occupied by mobile navigation, safe areas, and the optional cookie notice.
export function useMobileViewport(active: boolean) {
  const mainRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active) return;
    const main = mainRef.current;
    const bottom = bottomRef.current;
    if (!main || !bottom) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--app-bottom-inset', `${bottom.getBoundingClientRect().height}px`);
      main.style.setProperty('--app-content-height', `${main.clientHeight}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(main);
    observer.observe(bottom);
    update();
    return () => {
      observer.disconnect();
      root.style.removeProperty('--app-bottom-inset');
      main.style.removeProperty('--app-content-height');
    };
  }, [active]);

  return { mainRef, bottomRef };
}
