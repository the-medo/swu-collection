import { useCallback, useEffect } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { useToast } from '@/hooks/use-toast';
import {
  SearchFrom,
  useAdvancedCardSearchStore,
  useAdvancedCardSearchStoreActions,
  useInitializeStoreFromUrlParams,
} from './useAdvancedCardSearchStore';
import AdvancedSearchFilters from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx';
import AdvancedSearchResults from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchResults.tsx';
import { cn } from '@/lib/utils.ts';
import { Helmet } from 'react-helmet-async';

interface AdvancedCardSearchProps {
  children?: React.ReactNode;
  searchFrom?: SearchFrom;
}

const AdvancedCardSearch: React.FC<AdvancedCardSearchProps> = ({
  children,
  searchFrom = SearchFrom.CARD_SEARCH,
}) => {
  useInitializeStoreFromUrlParams(searchFrom);
  const { toast } = useToast();
  const { data: cardListData } = useCardList();
  const { searchInitialized, hasActiveFilters, handleSearch } =
    useAdvancedCardSearchStore(searchFrom);
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
      if (hasActiveFilters) {
        setSearchInitialized(true);
        onSearch();
      }
    }
  }, [hasActiveFilters, cardListData, searchInitialized, onSearch]);

  return (
    <>
      <Helmet title="Card Search | SWUBase" />
      <div
        className={cn(
          'flex',
          'flex-col @[580px]/main-body:flex-row',
          'min-h-[500px] @[580px]/main-body:min-h-[100vh]',
        )}
      >
        <AdvancedSearchFilters onSearch={onSearch} />
        <div className="flex flex-col @[1080px]/main-body:flex-row flex-[1]">
          <AdvancedSearchResults hasActiveFilters={hasActiveFilters} />
          {children}
        </div>
      </div>
    </>
  );
};

export default AdvancedCardSearch;
