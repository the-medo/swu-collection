import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Grid, List, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  useAdvancedCardSearchStore,
  useAdvancedCardSearchStoreActions,
} from '../useAdvancedCardSearchStore.ts';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { GridView } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/GridView.tsx';
import { ListView } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/ListView.tsx';

export interface ViewProps {
  cardListData: ReturnType<typeof useCardList>['data'];
  searchResults: string[];
  onCardClick: (cardId: string) => void;
}

interface AdvancedSearchResultsProps {
  hasActiveFilters: boolean;
}

const AdvancedSearchResults: React.FC<AdvancedSearchResultsProps> = ({ hasActiveFilters }) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: cardListData, isLoading: isLoadingCardList } = useCardList();
  const { searchResults, isSearching, resultsView } = useAdvancedCardSearchStore();
  const { setResultsView } = useAdvancedCardSearchStoreActions();

  const handleViewCard = (cardId: string) => {
    navigate({
      search: prev => ({ ...prev, modalCardId: cardId }),
    });
  };

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Search Results
            {searchResults.length > 0 && (
              <span className="text-sm text-muted-foreground">({searchResults.length} cards)</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={resultsView === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setResultsView('grid')}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={resultsView === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setResultsView('list')}
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                : 'Use the filters on the left to search for cards.'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            {resultsView === 'grid' ? (
              <GridView
                cardListData={cardListData}
                searchResults={searchResults}
                onCardClick={handleViewCard}
              />
            ) : (
              <ListView
                cardListData={cardListData}
                searchResults={searchResults}
                onCardClick={handleViewCard}
              />
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedSearchResults;
