import { useCallback, useEffect, useState } from 'react';
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
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { Button } from '@/components/ui/button.tsx';
import AdvancedSearchLayoutSelectors from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchLayoutSelectors.tsx';
import * as React from 'react';

interface AdvancedCardSearchProps {
  children?: React.ReactNode;
  childrenTitleButtonText?: string;
  searchFrom?: SearchFrom;
}

const AdvancedCardSearch: React.FC<AdvancedCardSearchProps> = ({
  children,
  childrenTitleButtonText,
  searchFrom = SearchFrom.CARD_SEARCH,
}) => {
  useInitializeStoreFromUrlParams(searchFrom);
  const { toast } = useToast();
  const { data: cardListData } = useCardList();
  const { searchInitialized, hasActiveFilters, handleSearch } =
    useAdvancedCardSearchStore(searchFrom);
  const { setSearchInitialized } = useAdvancedCardSearchStoreActions();
  const { open: sidebarOpen } = useSidebar();

  const [resultsOrChildren, setResultsOrChildren] = useState<'results' | 'children'>('results');

  const onSearch = useCallback(() => {
    if (!cardListData) {
      toast({
        title: 'Card data not available',
        description: 'Please try again when card data is loaded.',
        variant: 'destructive',
      });
      return;
    }
    setResultsOrChildren('results');
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

  if (!children) {
    return (
      <>
        <Helmet title="Card Search | SWUBase" />
        <div
          className={cn(
            'flex flex-col lg:flex-row min-h-[100vh] -m-2',
            sidebarOpen ? 'lg:flex-row' : 'md:flex-row',
          )}
        >
          <AdvancedSearchFilters onSearch={onSearch} />
          <AdvancedSearchResults hasActiveFilters={hasActiveFilters} />
        </div>
      </>
    );
  }

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
          <div className="flex flex-row gap-4 items-start flex-wrap p-2 @[1080px]/main-body:hidden">
            <Button
              onClick={() => setResultsOrChildren('results')}
              variant={resultsOrChildren === 'results' ? 'default' : 'outline'}
            >
              <h3 className="text-2xl font-semibold tracking-tight mb-0">Search Results</h3>
            </Button>
            <Button
              onClick={() => setResultsOrChildren('children')}
              variant={resultsOrChildren === 'children' ? 'default' : 'outline'}
            >
              <h3 className="text-2xl font-semibold tracking-tight mb-0">
                {childrenTitleButtonText}
              </h3>
            </Button>
            <AdvancedSearchLayoutSelectors />
          </div>
          <div
            className={cn(
              {
                hidden: resultsOrChildren === 'children',
              },
              '@[1080px]/main-body:flex flex-1',
            )}
          >
            <AdvancedSearchResults
              hasActiveFilters={hasActiveFilters}
              classNames={{
                title: 'hidden @[1080px]/main-body:flex',
              }}
            />
          </div>
          <div
            className={cn(
              {
                hidden: resultsOrChildren === 'results',
              },
              '@[1080px]/main-body:flex flex-1',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdvancedCardSearch;
