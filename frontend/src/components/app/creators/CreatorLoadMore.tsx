import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useInfiniteQueryScroll } from '@/hooks/useInfiniteQueryScroll.ts';

export function CreatorLoadMore({
  hasMore,
  loading,
  error,
  onLoad,
  label,
}: {
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  onLoad: () => void;
  label: string;
}) {
  const { observerTarget } = useInfiniteQueryScroll({
    hasNextPage: hasMore && !error,
    isFetchingNextPage: loading,
    fetchNextPage: onLoad,
    threshold: 0,
  });
  return (
    <div ref={observerTarget} className="flex min-h-12 flex-col items-center gap-2 py-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Could not load more {label}.
        </p>
      )}
      {(hasMore || error) && (
        <Button variant="outline" disabled={loading} onClick={onLoad}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {loading ? 'Loading…' : error ? 'Try again' : `Load more ${label}`}
        </Button>
      )}
    </div>
  );
}
