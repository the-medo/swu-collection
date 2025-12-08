import * as React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';

const CPExplainerTooltip: React.FC = () => {
  return (
    <div className="inline-flex items-center">
      <Popover hover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Card pool overview info"
            className="inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors"
          >
            <Info className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-[360px] max-h-[45vh] overflow-y-auto">
          <div className="flex flex-col gap-2 text-sm">
            <div className="font-medium mb-1">Welcome to card pool view!</div>
            <ul className="list-disc ml-5 space-y-1">
              <li>Card pool view is read‑only. You will need to create a deck from this pool.</li>
              <li>You can also browse your decks and other public decks built from this pool.</li>
              <li>
                If the pool is public or unlisted, you can share it with other players and let them
                build their decks!
              </li>
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CPExplainerTooltip;
