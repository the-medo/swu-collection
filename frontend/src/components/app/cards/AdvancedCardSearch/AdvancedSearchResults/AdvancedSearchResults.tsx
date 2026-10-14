import * as React from 'react';
import { clearCardSearchParams } from '../advancedSearchLib.ts';
import { Loader2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useAdvancedCardSearchStore } from '../useAdvancedCardSearchStore.ts';
import { Link, useNavigate } from '@tanstack/react-router';
import { getCardDetailDialogSearch } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';
import SearchCardLayout, { SearchCardLayoutProps } from './SearchCardLayout';
import { cn } from '@/lib/utils.ts';
import AdvancedSearchLayoutSelectors from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchLayoutSelectors.tsx';

interface AdvancedSearchResultsProps {
  hasActiveFilters: boolean;
  fillAvailableHeight?: boolean;
  classNames?: {
    title?: string;
  };
  cardSubcomponent?: SearchCardLayoutProps['cardSubcomponent'];
  showKarabastUnimplementedNameIcon?: boolean;
  showArtistShowcaseLink?: boolean;
}

const AdvancedSearchResults: React.FC<AdvancedSearchResultsProps> = ({
  hasActiveFilters,
  fillAvailableHeight = false,
  classNames,
  cardSubcomponent,
  showKarabastUnimplementedNameIcon = false,
  showArtistShowcaseLink = false,
}) => {
  const navigate = useNavigate();
  const { isLoading: isLoadingCardList } = useCardList();
  const { searchResults, searchResultVariants, isSearching, resultsLayout } =
    useAdvancedCardSearchStore();

  const handleViewCard = (cardId: string, variantId?: string) => {
    navigate({
      to: '.',
      search: previous => getCardDetailDialogSearch(previous, cardId, variantId),
    });
  };

  return (
    <div
      className={cn(
        'flex-1 min-h-full p-2',
        fillAvailableHeight &&
          '@[1080px]/main-body:flex @[1080px]/main-body:min-h-0 @[1080px]/main-body:flex-col',
      )}
    >
      <div
        className={cn(
          'flex flex-1 flex-wrap w-full justify-between items-start p-2',
          fillAvailableHeight && '@[1080px]/main-body:flex-none',
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
        <div className="flex flex-wrap items-center gap-3">
          {showArtistShowcaseLink && (
            <Link
              to="/cards/search"
              search={previous => clearCardSearchParams(previous)}
              className="text-sm text-primary hover:underline"
            >
              Card home
            </Link>
          )}
          {showArtistShowcaseLink && (
            <Link to="/artists" className="text-sm text-primary hover:underline">
              Artist showcase
            </Link>
          )}
          <AdvancedSearchLayoutSelectors />
        </div>
      </div>
      <div
        className={cn(
          fillAvailableHeight &&
            '@[1080px]/main-body:flex @[1080px]/main-body:min-h-0 @[1080px]/main-body:flex-1 @[1080px]/main-body:flex-col',
        )}
      >
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
            <ScrollArea
              className={cn(
                'h-[calc(100vh-90px)]',
                fillAvailableHeight &&
                  '@[1080px]/main-body:h-auto @[1080px]/main-body:min-h-0 @[1080px]/main-body:flex-1',
              )}
            >
              <SearchCardLayout
                searchResults={searchResults}
                resultVariants={searchResultVariants}
                onCardClick={handleViewCard}
                layoutType={resultsLayout}
                cardSubcomponent={cardSubcomponent}
                showKarabastUnimplementedNameIcon={showKarabastUnimplementedNameIcon}
              />
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearchResults;
