import { Button } from '@/components/ui/button.tsx';
import { SlidersHorizontal } from 'lucide-react';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '../useCardPoolDeckDetailStore.ts';

export function CPExpandButton({
  mobileExpanded,
  onMobileToggle,
}: {
  mobileExpanded: boolean;
  onMobileToggle: () => void;
}) {
  const { filtersExpanded } = useCardPoolDeckDetailStore();
  const { setFiltersExpanded } = useCardPoolDeckDetailStoreActions();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hidden lg:inline-flex"
        aria-label={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
        aria-expanded={filtersExpanded}
        aria-controls="pool-builder-filters"
        onClick={() => setFiltersExpanded(!filtersExpanded)}
      >
        <SlidersHorizontal className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        aria-label={mobileExpanded ? 'Collapse filters' : 'Expand filters'}
        aria-expanded={mobileExpanded}
        aria-controls="pool-builder-filters"
        onClick={onMobileToggle}
      >
        <SlidersHorizontal className="size-4" />
      </Button>
    </>
  );
}
