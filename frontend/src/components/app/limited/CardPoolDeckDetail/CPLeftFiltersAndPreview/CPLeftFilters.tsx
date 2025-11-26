import React from 'react';
import { useCardList } from '@/api/lists/useCardList';
import GenericMultiSelect from '@/components/app/global/GenericMultiSelect/GenericMultiSelect.tsx';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator.tsx';
import { RefreshCcw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '../useCardPoolDeckDetailStore';
import CPGroupingSelector from './CPGroupingSelector';
import CPLayoutOptions from './CPLayoutOptions';

export interface CPLeftFiltersProps {
  className?: string;
}

const CPLeftFilters: React.FC<CPLeftFiltersProps> = ({ className }) => {
  const { data: cardListData } = useCardList();
  const {
    filterTraits,
    filterKeywords,
    activeFiltersCount,
    contentBoxesBy,
    contentStacksBy,
    showCardsInDeck,
    showRemovedCards,
    showUnfilteredCards,
  } = useCardPoolDeckDetailStore();
  const {
    setFilterTraits,
    setFilterKeywords,
    resetFilters,
    setContentBoxesBy,
    setContentStacksBy,
    setShowCardsInDeck,
    setShowRemovedCards,
    setShowUnfilteredCards,
  } = useCardPoolDeckDetailStoreActions();

  return (
    <div className={className}>
      <Accordion type="multiple" defaultValue={['layout', 'grouping', 'visibility', 'filters']}>
        <AccordionItem value="grouping">
          <AccordionTrigger className="text-sm font-semibold">Grouping</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <CPGroupingSelector
                showX={true}
                label="Boxes"
                value={contentBoxesBy}
                onChange={setContentBoxesBy}
              />
              <CPGroupingSelector
                label="Stacks by"
                value={contentStacksBy}
                onChange={setContentStacksBy}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="visibility">
          <AccordionTrigger className="text-sm font-semibold">
            Visibility in card pool
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showCardsInDeck}
                  onCheckedChange={v => setShowCardsInDeck(v === true)}
                />
                <span>Show cards in deck</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showRemovedCards}
                  onCheckedChange={v => setShowRemovedCards(v === true)}
                />
                <span>Show removed cards</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showUnfilteredCards}
                  onCheckedChange={v => setShowUnfilteredCards(v === true)}
                />
                <span>Show unfiltered cards</span>
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="filters">
          <AccordionTrigger className="text-sm font-semibold">Filters</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 mt-2">
              {cardListData ? (
                <GenericMultiSelect
                  label="Traits"
                  placeholder="Select traits..."
                  options={cardListData.allTraits}
                  value={filterTraits}
                  onChange={setFilterTraits}
                  maxCount={4}
                />
              ) : (
                <div className="text-center py-2">Loading traits...</div>
              )}
              {cardListData ? (
                <GenericMultiSelect
                  label="Keywords"
                  placeholder="Select keywords..."
                  options={cardListData.allKeywords}
                  value={filterKeywords}
                  onChange={setFilterKeywords}
                  maxCount={4}
                />
              ) : (
                <div className="text-center py-2">Loading keywords...</div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-xs">Applied: {activeFiltersCount}</div>
                {activeFiltersCount > 0 && (
                  <Button size="sm" variant="secondary" onClick={resetFilters}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="layout">
          <AccordionTrigger className="text-sm font-semibold">Layout</AccordionTrigger>
          <AccordionContent>
            <CPLayoutOptions />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="px-6 my-2">
        <Separator />
      </div>
    </div>
  );
};

export default CPLeftFilters;
