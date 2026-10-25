import { useSearch } from '@tanstack/react-router';
import CardHome from '../CardHome/CardHome.tsx';
import { cardSearchParams, hasCardSearchRequest } from './advancedSearchLib.ts';
import { useCallback, useEffect, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { useToast } from '@/hooks/use-toast';
import {
  SearchFrom,
  useApplyAdvancedCardSearchDefaults,
  useAdvancedCardSearchStore,
  useAdvancedCardSearchStoreActions,
  useInitializeStoreFromUrlParams,
} from './useAdvancedCardSearchStore';
import AdvancedSearchFilters from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchFilters.tsx';
import AdvancedSearchResults from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchResults.tsx';
import { cn } from '@/lib/utils.ts';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button.tsx';
import AdvancedSearchLayoutSelectors from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchLayoutSelectors.tsx';
import * as React from 'react';
import { SearchCardLayoutProps } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/SearchCardLayout.tsx';
import { AdvancedCardSearchContextConfig } from '@/components/app/cards/AdvancedCardSearch/advancedSearchContext.ts';

import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';

interface AdvancedCardSearchProps {
  children?: React.ReactNode;
  showCardHome?: boolean;
  filtersFooterElement?: React.ReactNode;
  childrenTitleButtonText?: string;
  searchFrom?: SearchFrom;
  cardSubcomponent?: SearchCardLayoutProps['cardSubcomponent'];
  searchContext?: AdvancedCardSearchContextConfig;
  resultsHeader?: React.ReactNode;
  alternativeResults?: { title: string; content: React.ReactNode };
}

const AdvancedCardSearch: React.FC<AdvancedCardSearchProps> = ({
  children,
  showCardHome = false,
  filtersFooterElement,
  childrenTitleButtonText,
  searchFrom = SearchFrom.CARD_SEARCH,
  cardSubcomponent,
  searchContext,
  resultsHeader,
  alternativeResults,
}) => {
  const compact = searchFrom === SearchFrom.DECKBUILDER;
  const urlSearch = useSearch({ strict: false });
  const hasRequestedSearch = hasCardSearchRequest(cardSearchParams.parse(urlSearch));
  const displayHome = showCardHome && !hasRequestedSearch;
  const urlSynchronized = useInitializeStoreFromUrlParams(searchFrom);
  useApplyAdvancedCardSearchDefaults(searchFrom, searchContext);
  const { toast } = useToast();
  const { data: cardListData } = useCardList();
  const { searchInitialized, hasActiveFilters, handleSearch } =
    useAdvancedCardSearchStore(searchFrom);
  const { setSearchInitialized } = useAdvancedCardSearchStoreActions();

  const [resultsOrChildren, setResultsOrChildren] = useState<'results' | 'children'>('results');
  const [homeFiltersOpen, setHomeFiltersOpen] = useState(false);
  const showKarabastUnimplementedNameIcon = searchFrom === SearchFrom.DECKBUILDER;

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
    setHomeFiltersOpen(false);
    void handleSearch(cardListData, searchContext);
  }, [cardListData, handleSearch, searchContext, toast]);

  useEffect(() => {
    if (
      !cardListData ||
      !urlSynchronized ||
      searchInitialized ||
      displayHome ||
      (!hasActiveFilters && !hasRequestedSearch)
    )
      return;
    setSearchInitialized(true);
    void handleSearch(cardListData, searchContext, { replace: true });
  }, [
    cardListData,
    urlSynchronized,
    displayHome,
    hasRequestedSearch,
    handleSearch,
    hasActiveFilters,
    searchContext,
    searchInitialized,
    setSearchInitialized,
  ]);

  if (!children) {
    return (
      <>
        <Helmet title="Card Search | SWUBase" />
        <div
          className={cn(
            'flex flex-col lg:flex-row min-h-screen -m-2',
            // sidebarOpen ? 'lg:flex-row' : 'md:flex-row',
          )}
        >
          {(!displayHome || homeFiltersOpen) && (
            <AdvancedSearchFilters
              key={displayHome ? 'home-filters' : 'results-filters'}
              onSearch={onSearch}
              mobileCollapsible={showCardHome}
              onClose={
                displayHome
                  ? () => {
                      setHomeFiltersOpen(false);
                      document.getElementById('card-home-filters-trigger')?.focus();
                    }
                  : undefined
              }
              availableCardTypes={searchContext?.availableCardTypes}
            />
          )}
          {displayHome ? (
            <CardHome
              onSearch={onSearch}
              filtersOpen={homeFiltersOpen}
              onToggleFilters={() => setHomeFiltersOpen(open => !open)}
            />
          ) : (
            <AdvancedSearchResults
              hasActiveFilters={hasActiveFilters}
              showArtistShowcaseLink={searchFrom === SearchFrom.CARD_SEARCH}
              showKarabastUnimplementedNameIcon={showKarabastUnimplementedNameIcon}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title="Card Search | SWUBase" />
      <div
        className={cn(
          'flex min-w-0',
          compact && workspaceStyles.theme,
          'flex-col @[580px]/main-body:flex-row',
          'min-h-[500px] @[580px]/main-body:min-h-screen',
        )}
      >
        <AdvancedSearchFilters
          onSearch={onSearch}
          compact={compact}
          footerElement={filtersFooterElement}
          availableCardTypes={searchContext?.availableCardTypes}
          disabled={!!alternativeResults}
        />
        <div className="flex min-w-0 flex-col @[1080px]/main-body:flex-row flex-1">
          <div
            className={cn(
              'flex flex-row gap-2 items-center flex-wrap p-2 @[1080px]/main-body:hidden',
              compact &&
                'border-b border-[var(--workspace-border)] bg-[var(--workspace-soft)] [&_button]:h-8',
            )}
          >
            <Button
              onClick={() => setResultsOrChildren('results')}
              variant={resultsOrChildren === 'results' ? 'default' : 'outline'}
            >
              <span
                className={
                  compact ? 'text-sm font-semibold' : 'text-2xl font-semibold tracking-tight'
                }
              >
                {alternativeResults?.title ?? 'Search Results'}
              </span>
            </Button>
            <Button
              onClick={() => setResultsOrChildren('children')}
              variant={resultsOrChildren === 'children' ? 'default' : 'outline'}
            >
              <span
                className={
                  compact ? 'text-sm font-semibold' : 'text-2xl font-semibold tracking-tight'
                }
              >
                {childrenTitleButtonText}
              </span>
            </Button>
            {resultsOrChildren === 'results' && (
              <AdvancedSearchLayoutSelectors showSort={!alternativeResults} />
            )}
          </div>
          <div
            className={cn(
              {
                hidden: resultsOrChildren === 'children',
              },
              '@[1080px]/main-body:flex flex-col flex-1 min-w-0 border-r',
              compact && 'border-[var(--workspace-border)]',
              resultsHeader && '@[1080px]/main-body:h-[calc(100dvh-1rem)]',
            )}
          >
            {resultsHeader}
            {alternativeResults?.content ?? (
              <AdvancedSearchResults
                hasActiveFilters={hasActiveFilters}
                compact={compact}
                showArtistShowcaseLink={searchFrom === SearchFrom.CARD_SEARCH}
                classNames={{
                  title: 'hidden @[1080px]/main-body:flex',
                }}
                fillAvailableHeight={!!resultsHeader}
                cardSubcomponent={cardSubcomponent}
                showKarabastUnimplementedNameIcon={showKarabastUnimplementedNameIcon}
              />
            )}
          </div>
          <div
            className={cn(
              {
                hidden: resultsOrChildren === 'results',
              },
              '@[1080px]/main-body:flex min-w-0 flex-1 p-2',
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
