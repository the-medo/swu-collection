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
}

const DeckFiltersAccordion: React.FC<DeckFiltersAccordionProps> = ({
  defaultOpen = false,
  initialized,
}) => {
  const { activeFiltersCount } = useDeckFilterStore();

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen || activeFiltersCount > 0 ? 'filters' : undefined}
      className="w-full mb-2 sticky"
    >
      <AccordionItem value="filters" className="border rounded-md">
        <AccordionTrigger className="px-4 pt-3 pb-1 hover:no-underline">
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
        <AccordionContent className="p-0">
          <DeckFilters initialized={initialized} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default DeckFiltersAccordion;
