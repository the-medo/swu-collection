import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  totalItems: number;
  initialItemsToLoad?: number;
  itemsPerBatch?: number;
  threshold?: number;
}

export function useInfiniteScroll({
  totalItems,
  initialItemsToLoad = 50,
  itemsPerBatch = 30,
  threshold = 200, // pixels from bottom to trigger loading more
}: UseInfiniteScrollOptions) {
  const [itemsToShow, setItemsToShow] = useState(Math.min(initialItemsToLoad, totalItems));
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const hasMore = itemsToShow < totalItems;

  useEffect(() => {
    // If totalItems changed and we have no items showing but should have some
    if (totalItems > 0 && itemsToShow === 0) {
      setItemsToShow(Math.min(initialItemsToLoad, totalItems));
    }
  }, [totalItems, initialItemsToLoad, itemsToShow]);

  // Load more items when the sentinel element becomes visible
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      setItemsToShow(prev => Math.min(prev + itemsPerBatch, totalItems));
      setIsLoading(false);
    }, 50);
  }, [isLoading, hasMore, itemsPerBatch, totalItems]);

  // Setup the intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: `0px 0px ${threshold}px 0px`,
        threshold: 0.1,
      },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, threshold]);

  return {
    itemsToShow,
    isLoading,
    hasMore,
    observerTarget,
    loadMore,
  };
}
