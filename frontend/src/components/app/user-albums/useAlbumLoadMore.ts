import { useEffect, useRef } from 'react';

// Keep keyboard focus useful when a final page removes its Load more control.
export function useAlbumLoadMore(
  count: number,
  fetching: boolean,
  fetchMore: () => Promise<unknown>,
  itemSelector = '[data-album-item]',
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pending = useRef<{ count: number; source: Element | null } | null>(null);
  useEffect(() => {
    if (fetching || !pending.current) return;
    const previous = pending.current;
    pending.current = null;
    if (
      count <= previous.count ||
      (document.activeElement !== previous.source && document.activeElement !== document.body)
    )
      return;
    const elements = containerRef.current?.querySelectorAll<HTMLElement>(itemSelector);
    elements?.[previous.count]?.focus();
  }, [count, fetching, itemSelector]);
  return {
    containerRef,
    loadMore: () => {
      pending.current = { count, source: document.activeElement };
      return fetchMore();
    },
  };
}
