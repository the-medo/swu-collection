import * as React from 'react';
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  Columns,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Search,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useAdvancedCardSearchStore } from '../useAdvancedCardSearchStore.ts';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import SearchCardLayout from './SearchCardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { SortField } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/useSearchCardTableColumns.tsx';
import { useCallback } from 'react';

interface AdvancedSearchResultsProps {
  hasActiveFilters: boolean;
}

const AdvancedSearchResults: React.FC<AdvancedSearchResultsProps> = ({ hasActiveFilters }) => {
  const navigate = useNavigate({ from: Route.fullPath });
  const { isLoading: isLoadingCardList } = useCardList();
  const {
    searchResults,
    isSearching,
    resultsLayout,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    setResultsLayout,
  } = useAdvancedCardSearchStore();

  const handleViewCard = (cardId: string) => {
    navigate({
      search: prev => ({ ...prev, modalCardId: cardId }),
    });
  };

  // Get sort icon based on current state
  const getSortIcon = useCallback(
    (field: SortField) => {
      if (sortField !== field) return null;

      if (field === 'cost') {
        return sortOrder === 'asc' ? (
          <ArrowDownUp className="h-4 w-4" />
        ) : (
          <ArrowUpAZ className="h-4 w-4" />
        );
      } else {
        return sortOrder === 'asc' ? (
          <ArrowUpAZ className="h-4 w-4" />
        ) : (
          <ArrowDownAZ className="h-4 w-4" />
        );
      }
    },
    [sortField, sortOrder],
  );

  const handleSortFieldChange = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    },
    [sortField, sortOrder],
  );

  return (
    <div className="flex-1 min-h-full p-2">
      <div className="flex justify-between items-center p-2">
        <h3 className="text-2xl font-semibold tracking-tight">
          Search Results
          {searchResults.length > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              ({searchResults.length} cards)
            </span>
          )}
        </h3>
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
            <div className="flex justify-between items-center mb-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Sort by: {sortField.charAt(0).toUpperCase() + sortField.slice(1)}
                      {getSortIcon(sortField)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuRadioGroup
                      value={sortField}
                      onValueChange={value => handleSortFieldChange(value as SortField)}
                    >
                      <DropdownMenuRadioItem value="name">
                        Name {getSortIcon('name')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="type">
                        Type {getSortIcon('type')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="cost">
                        Cost {getSortIcon('cost')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="rarity">
                        Rarity {getSortIcon('rarity')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="cardNumber">
                        Card Number {getSortIcon('cardNumber')}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                <Button
                  variant={resultsLayout === 'imageBig' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResultsLayout('imageBig')}
                  title="Grid View - Big Images"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Large</span>
                </Button>
                <Button
                  variant={resultsLayout === 'imageSmall' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResultsLayout('imageSmall')}
                  title="Grid View - Small Images"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Small</span>
                </Button>
                <Button
                  variant={resultsLayout === 'tableImage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResultsLayout('tableImage')}
                  title="Table View with Images"
                >
                  <List className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={resultsLayout === 'tableSmall' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResultsLayout('tableSmall')}
                  title="Compact Table View"
                >
                  <Columns className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Table</span>
                </Button>
              </div>
            </div>
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
