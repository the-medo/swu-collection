import { useCallback, useEffect } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { useToast } from '@/hooks/use-toast';
import {
  useAdvancedCardSearchStore,
  useAdvancedCardSearchStoreActions,
  useInitializeStoreFromUrlParams,
} from './useAdvancedCardSearchStore';
import AdvancedSearchFilters from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx';
import AdvancedSearchResults from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchResults.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { cn } from '@/lib/utils.ts';

const AdvancedCardSearch: React.FC = () => {
  useInitializeStoreFromUrlParams();
  const { toast } = useToast();
  const { open: sidebarOpen } = useSidebar();
  const { data: cardListData } = useCardList();
  const { searchInitialized, hasActiveFilters, handleSearch } = useAdvancedCardSearchStore();
  const { setSearchInitialized } = useAdvancedCardSearchStoreActions();

  const onSearch = useCallback(() => {
    if (!cardListData) {
      toast({
        title: 'Card data not available',
        description: 'Please try again when card data is loaded.',
        variant: 'destructive',
      });
      return;
    }

    void handleSearch(cardListData);
  }, [cardListData, handleSearch]);

  useEffect(() => {
    if (cardListData && !searchInitialized) {
      setSearchInitialized(true);
      if (hasActiveFilters) onSearch();
    }
  }, [hasActiveFilters, cardListData, searchInitialized, onSearch]);

  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row min-h-[100vh] -m-2',
        sidebarOpen ? 'lg:flex-row' : 'md:flex-row',
      )}
    >
      <AdvancedSearchFilters onSearch={onSearch} />
      <AdvancedSearchResults hasActiveFilters={hasActiveFilters} />
    </div>
  );
};

export default AdvancedCardSearch;
