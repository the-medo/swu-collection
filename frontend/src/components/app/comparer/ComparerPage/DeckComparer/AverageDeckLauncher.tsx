import { Layers3 } from 'lucide-react';
import type { Ref } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { CardList } from '../../../../../../../lib/swu-resources/types.ts';

const AverageDeckLauncher = ({
  deckCount,
  onStart,
  buttonRef,
  leader,
  cards,
}: {
  deckCount: number;
  onStart: () => void;
  buttonRef: Ref<HTMLButtonElement>;
  leader: CardList[string] | undefined;
  cards: (CardList[string] | undefined)[];
}) => (
  <aside
    aria-label="Combine these decks"
    className={cn(
      workspaceStyles.panel,
      'flex items-center gap-4 bg-gradient-to-b from-[var(--workspace-soft)] to-card p-4 xl:col-start-2 xl:row-start-1 xl:block',
    )}
  >
    <div
      aria-hidden="true"
      className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-40 xl:mx-auto xl:mb-4 xl:h-40 xl:w-48"
    >
      {[cards[0], cards[1]].map((card, index) => (
        <div
          key={index}
          className={cn(
            'absolute top-5 w-14 overflow-hidden rounded-md border border-[var(--workspace-border)] bg-card shadow-md sm:w-18 xl:w-20',
            index === 0 ? 'left-0 -rotate-12' : 'right-0 rotate-12',
          )}
        >
          <CardImage
            card={card}
            cardVariantId={card ? selectDefaultVariant(card) : undefined}
            size="responsive"
            backSideButton={false}
          />
        </div>
      ))}
      <div className="absolute left-1/2 top-0 z-10 w-18 -translate-x-1/2 overflow-hidden rounded-md border border-[var(--workspace-accent)]/30 bg-card shadow-lg sm:w-22 xl:w-25">
        <CardImage
          card={leader}
          cardVariantId={leader ? selectDefaultVariant(leader) : undefined}
          size="responsive"
          backSide={!!leader?.back}
          backSideButton={false}
        >
          {!leader && (
            <Layers3 className="size-7 text-[var(--workspace-accent)]" strokeWidth={1.5} />
          )}
        </CardImage>
      </div>
    </div>
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--workspace-accent)]">
        {deckCount} decks <span aria-hidden="true">→</span> your next deck
      </p>
      <h2 className={workspaceStyles.heading}>Combine these decks</h2>
      <p className="mb-4 mt-2 text-xs leading-relaxed text-muted-foreground">
        Start with the average counts, then make the list your own.
      </p>
      <Button ref={buttonRef} type="button" className="w-full" onClick={onStart}>
        Start combining
      </Button>
    </div>
  </aside>
);

export default AverageDeckLauncher;
