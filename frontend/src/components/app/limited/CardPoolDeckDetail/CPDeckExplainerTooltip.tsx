import * as React from 'react';
import { Info, FilterX, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Kbd } from '@/components/ui/kbd.tsx';

const CPDeckExplainerTooltip: React.FC = () => {
  return (
    <div className="inline-flex items-center">
      <Popover hover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Card pool deck editing help"
            className="inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors"
          >
            <Info className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-[420px] max-h-[45vh] overflow-y-auto">
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <div className="font-medium mb-1">Card pool deck editing</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  When you create a new deck, the entire card pool is visible. You can filter and
                  group cards using the controls on this page.
                </li>
                <li>
                  After you save your desired Leader and Base, cards are auto‑filtered by their
                  aspects. You can adjust this using the Aspect filter.
                </li>
                <li>
                  Select cards by clicking them in the pool. Then move them to the deck or trash
                  using the buttons in the action bar at the bottom of the screen.
                </li>
              </ul>
            </div>

            <div className="rounded-md border border-border bg-muted/50 p-2">
              <div className="font-medium mb-1">Tips</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Try different grouping, visibility, and layout options to see which setup fits
                  your needs.
                </li>
                <li>
                  Collapse the filters on the left by clicking the{' '}
                  <span className="inline-flex items-center gap-1 align-middle">
                    <FilterX className="inline size-4" />
                  </span>{' '}
                  button to the left of the deck title (or press <Kbd>Esc</Kbd> when keyboard
                  shortcuts are enabled).
                </li>
                <li>
                  Switch to the decklist view by clicking the{' '}
                  <span className="inline-flex items-center gap-1 align-middle">
                    <Eye className="inline size-4" />
                  </span>{' '}
                  button in the top‑right (or press <Kbd>Space</Kbd>).
                </li>
                <li>
                  You can quickly select or deselect columns or even whole boxes of cards in the
                  card pool.
                </li>
              </ul>
            </div>

            <div>
              <div className="font-medium mb-1">Recommended workflow for deck making</div>
              <ol className="list-decimal ml-5 space-y-1">
                <li>
                  Check your 2‑cost cards and other early playables to see which aspects are
                  actually playable.
                </li>
                <li>Choose your Leader/Base combination accordingly.</li>
                <li>Select your desired cards and add them to the deck.</li>
              </ol>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CPDeckExplainerTooltip;
