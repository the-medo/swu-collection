import type { CardList } from '../../../../../../../lib/swu-resources/types.ts';
import {
  homeworldBaseTraits,
  homeworldBasicBasesByTrait,
} from '../../../../../../../shared/lib/basicBases.ts';
import { SwuAspect, SwuSet } from '../../../../../../../types/enums.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';

const aspects = [
  SwuAspect.VIGILANCE,
  SwuAspect.COMMAND,
  SwuAspect.AGGRESSION,
  SwuAspect.CUNNING,
] as const;

interface CPHomeworldBaseTableProps {
  cards: CardList;
  savedBaseId: string;
  selectedBaseId: string;
  onSelect: (cardId: string) => void;
  onHover: (cardId: string) => void;
  showPreview: boolean;
}

const CPHomeworldBaseTable = ({
  cards,
  savedBaseId,
  selectedBaseId,
  onSelect,
  onHover,
  showPreview,
}: CPHomeworldBaseTableProps) => (
  <div className="min-w-0 max-w-full space-y-2">
    <div>
      <h4 className="text-sm font-semibold">Homeworlds bases</h4>
      <p className="text-xs text-muted-foreground">
        All 16 basic bases are available. Choose an aspect and a homeworld trait.
      </p>
    </div>
    <div className="overflow-x-auto rounded-md border">
      <Table className="w-auto" aria-label="Homeworlds basic bases by aspect and trait">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead scope="col">Aspect</TableHead>
            {homeworldBaseTraits.map(trait => (
              <TableHead key={trait} scope="col" className="text-center">
                {trait}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {aspects.map(aspect => (
            <TableRow key={aspect}>
              <TableHead scope="row">
                <span className="flex items-center gap-2 text-foreground">
                  <AspectIcon aspect={aspect} size="small" />
                  <span className="sr-only sm:not-sr-only">{aspect}</span>
                </span>
              </TableHead>
              {homeworldBaseTraits.map(trait => {
                const cardId = homeworldBasicBasesByTrait[trait][aspect];
                const card = cards[cardId];
                const selected = selectedBaseId === cardId;
                const saved = savedBaseId === cardId;
                // Reprinted bases should show the Homeworlds printing and its trait.
                const variantId = card
                  ? (Object.values(card.variants).find(
                      v => v?.set === SwuSet.HMW && v.variantName === 'Standard',
                    )?.variantId ?? selectDefaultVariant(card))
                  : undefined;

                return (
                  <TableCell key={trait} className="p-1 align-top">
                    <DeckCardHoverImage
                      card={card}
                      defaultVariantId={variantId}
                      size="w300"
                      active={showPreview}
                      interactive={false}
                    >
                      <button
                        type="button"
                        aria-label={`${card?.name ?? cardId} — ${aspect}, ${trait}${saved ? ' (saved)' : ''}`}
                        aria-pressed={selected}
                        disabled={!card}
                        onClick={() => onSelect(cardId)}
                        onMouseEnter={() => onHover(cardId)}
                        onFocus={() => onHover(cardId)}
                        className={cn(
                          'flex h-full w-28 flex-col items-center gap-1 rounded-md p-2 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                          saved && 'bg-muted ring-2 ring-inset ring-foreground',
                          selected && !saved && 'bg-primary/10 ring-2 ring-inset ring-primary',
                        )}
                      >
                        <CardImage
                          card={card}
                          cardVariantId={variantId}
                          forceHorizontal
                          size="w75"
                          backSideButton={false}
                        />
                        <span className="w-full text-center leading-tight">
                          {card?.name ?? 'Unavailable'}
                        </span>
                        {saved && <span className="text-[10px] text-muted-foreground">Saved</span>}
                      </button>
                    </DeckCardHoverImage>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default CPHomeworldBaseTable;
