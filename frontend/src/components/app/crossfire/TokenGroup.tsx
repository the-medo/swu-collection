import type { ReactNode } from 'react';
import { Shield, Plus, Minus, ArrowUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import type { VisibleCard } from '../../../../../play/view/types.ts';
import { CardMarkers } from './CardMarkers.tsx';
import { useCardInspection } from './useCardInspection.ts';

// Group the presentation, never the physical identities used by decisions/logs.
export function TokenGroup({
  type,
  cards,
  available,
  highlighted,
  selections,
  renderCard,
  inspect,
}: {
  type: string;
  cards: VisibleCard[];
  available: string[];
  highlighted: string[];
  selections: string[];
  renderCard: (card: VisibleCard) => ReactNode;
  inspect: (id: string) => void;
}) {
  const Icon =
    { shield: Shield, experience: Plus, advantage: ArrowUp, weakness: Minus }[type] ?? Plus;
  const warnings = [...new Set(cards.flatMap(c => c.face?.warnings ?? []))];
  const inspection = useCardInspection(cards[0]?.id ?? null, inspect);
  return (
    <div className={`cf-token-overlay cf-overlay-${type}`}>
      {cards.length === 1 ? (
        renderCard(cards[0])
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              {...inspection}
              className={`cf-card cf-token cf-token-${type}`}
              data-token-handles={cards.map(c => c.id).join(' ')}
              data-available={cards.some(c => available.includes(c.id))}
              data-highlighted={cards.some(c => highlighted.includes(c.id))}
              data-warning={warnings.length > 0}
              aria-pressed={cards.some(c => selections.includes(c.id))}
              aria-label={`${cards.length} ${cards[0].face?.name ?? type} tokens — inspect or choose a token${warnings.length ? `. ${warnings.join(' ')}` : ''}`}
            >
              <Icon />
              <span className="cf-token-count">{cards.length}</span>
              <CardMarkers warnings={warnings} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="cf-token-choices w-auto p-3" side="top">
            <p className="text-xs mb-2">{cards[0].face?.name} · Choose a token</p>
            <div className="flex gap-3">{cards.map(renderCard)}</div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
