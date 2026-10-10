import { useCallback, useLayoutEffect, useRef } from 'react';

// Move one persistent editor to its comment. If that comment disappears during
// a refresh, move the same editor to the fallback so its draft stays available.
export function useCommentComposerPortal(host: HTMLDivElement) {
  const inline = useRef<HTMLDivElement | null>(null);
  const fallback = useRef<HTMLDivElement | null>(null);
  const move = useCallback(
    (destination: HTMLDivElement | null) => {
      if (!destination || host.parentElement === destination) return;
      const active = host.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : null;
      destination.appendChild(host);
      active?.focus({ preventScroll: true });
      if (active && destination === fallback.current) active.scrollIntoView({ block: 'nearest' });
    },
    [host],
  );
  const inlineSlot = useCallback(
    (node: HTMLDivElement | null) => {
      inline.current = node;
      move(node ?? fallback.current);
    },
    [move],
  );
  const fallbackSlot = useCallback(
    (node: HTMLDivElement | null) => {
      fallback.current = node;
      if (!inline.current) move(node);
    },
    [move],
  );
  useLayoutEffect(() => {
    move(inline.current ?? fallback.current);
  });
  return { inlineSlot, fallbackSlot };
}
