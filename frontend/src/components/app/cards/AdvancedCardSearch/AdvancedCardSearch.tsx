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

const AdvancedCardSearch: React.FC = () => {
  useInitializeStoreFromUrlParams();
  const { toast } = useToast();
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        <AdvancedSearchFilters onSearch={onSearch} />
        <AdvancedSearchResults hasActiveFilters={hasActiveFilters} />
      </div>
    </div>
  );
};

export default AdvancedCardSearch;
