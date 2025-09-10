import * as React from 'react';
import { useAdvancedCardSearchStore } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import { useCallback } from 'react';
import { SortField } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/useSearchCardTableColumns.tsx';
import { NavigationMenu, NavigationMenuList } from '@/components/ui/navigation-menu.tsx';
import { cn } from '@/lib/utils.ts';
import SortMenu from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/SortMenu.tsx';
import ResultsLayoutMenu from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/ResultsLayoutMenu.tsx';

interface AdvancedSearchLayoutSelectorsProps {}

const AdvancedSearchLayoutSelectors: React.FC<AdvancedSearchLayoutSelectorsProps> = ({}) => {
  const { resultsLayout, sortField, sortOrder, setSortField, setSortOrder, setResultsLayout } =
    useAdvancedCardSearchStore();

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
    <NavigationMenu className={cn('justify-end')}>
      <NavigationMenuList className="gap-2 justify-end flex-wrap">
        <SortMenu
          sortField={sortField}
          sortOrder={sortOrder}
          onChange={(value: SortField) => handleSortFieldChange(value)}
        />
        <ResultsLayoutMenu layout={resultsLayout} onChange={setResultsLayout} />
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default AdvancedSearchLayoutSelectors;
