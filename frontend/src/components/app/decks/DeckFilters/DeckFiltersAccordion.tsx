import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import DeckFilters from '@/components/app/decks/DeckFilters/DeckFilters.tsx';
import { SlidersHorizontal } from 'lucide-react';
import { useDeckFilterStore } from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';

interface DeckFiltersAccordionProps {
  defaultOpen?: boolean;
  initialized?: boolean;
  actions?: React.ReactNode;
}

const DeckFiltersAccordion: React.FC<DeckFiltersAccordionProps> = ({
  defaultOpen = false,
  initialized,
  actions,
}) => {
  const { activeFiltersCount } = useDeckFilterStore();

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen || activeFiltersCount > 0 ? 'filters' : undefined}
      className="w-full"
    >
      <AccordionItem
        value="filters"
        className={cn(
          'flex flex-wrap items-center border rounded-md [&>h3]:flex-1',
          browseStyles.deckFilterPanel,
        )}
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                {activeFiltersCount} active
              </span>
            )}
          </div>
        </AccordionTrigger>
        {actions && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 px-3 py-1.5">
            {actions}
          </div>
        )}
        <div className="w-full">
          <AccordionContent className="p-0">
            <DeckFilters initialized={initialized} />
          </AccordionContent>
        </div>
      </AccordionItem>
    </Accordion>
  );
};

export default DeckFiltersAccordion;
