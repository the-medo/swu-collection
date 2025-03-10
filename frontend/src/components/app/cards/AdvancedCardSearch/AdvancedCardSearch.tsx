import { useCallback } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { useToast } from '@/hooks/use-toast';
import { useAdvancedCardSearchStore } from './useAdvancedCardSearchStore';
import AdvancedSearchFilters from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx';
import AdvancedSearchResults from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchResults.tsx';

const AdvancedCardSearch: React.FC = () => {
  const { toast } = useToast();

  const { data: cardListData } = useCardList();

  const { hasActiveFilters, handleSearch } = useAdvancedCardSearchStore();

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
  }, [handleSearch]);

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
