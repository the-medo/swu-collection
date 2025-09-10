import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useAdvancedCardSearchStore } from '../useAdvancedCardSearchStore.ts';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import SearchCardLayout from './SearchCardLayout';
import { cn } from '@/lib/utils.ts';
import AdvancedSearchLayoutSelectors from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchLayoutSelectors.tsx';

interface AdvancedSearchResultsProps {
  hasActiveFilters: boolean;
  classNames?: {
    title?: string;
  };
}

const AdvancedSearchResults: React.FC<AdvancedSearchResultsProps> = ({
  hasActiveFilters,
  classNames,
}) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { isLoading: isLoadingCardList } = useCardList();
  const { searchResults, isSearching, resultsLayout } = useAdvancedCardSearchStore();

  const handleViewCard = (cardId: string) => {
    navigate({
      search: prev => ({ ...prev, modalCardId: cardId }),
    });
  };

  return (
    <div className="flex-1 min-h-full p-2">
      <div
        className={cn(
          'flex flex-1 flex-wrap w-full justify-between items-start p-2',
          classNames?.title,
        )}
      >
        <h3 className="text-2xl font-semibold tracking-tight">
          Search Results
          {searchResults.length > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              ({searchResults.length} cards)
            </span>
          )}
        </h3>
        <AdvancedSearchLayoutSelectors />
      </div>
      <div>
        {isLoadingCardList ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading card data...</span>
          </div>
        ) : isSearching ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Searching...</span>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No results found</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              {hasActiveFilters
                ? "Try adjusting your search filters to find what you're looking for."
                : ''}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[calc(100vh-165px)]">
              <SearchCardLayout
                searchResults={searchResults}
                onCardClick={handleViewCard}
                layoutType={resultsLayout}
              />
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearchResults;
