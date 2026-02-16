import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteQueryScrollOptions {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading?: boolean;
  threshold?: number;
}

export function useInfiniteQueryScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading = false,
  threshold = 200,
}: UseInfiniteQueryScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(() => {
    if (!isFetchingNextPage && !isLoading && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          handleIntersect();
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
  }, [handleIntersect, threshold]);

  return { observerTarget };
}
