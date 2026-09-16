import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './CrossfireDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { GameView } from '../../../../../play/view/types.ts';
import { FaceImage } from './GameCard.tsx';
import { inspectionCards } from './inspection.ts';
import { words } from './presentation.ts';

export function CardInspection({
  view,
  selected,
  inspect,
}: {
  view: GameView;
  selected: string | null;
  inspect: (id: string | null) => void;
}) {
  const cards = inspectionCards(view, selected);
  const index = cards.findIndex(card => card.id === selected);
  const current = cards[index];
  const navigate = (offset: number) => {
    const next = cards[index + offset];
    if (next) inspect(next.id);
  };
  return (
    <Dialog
      open={!!current}
      onOpenChange={open => {
        if (!open) inspect(null);
      }}
    >
      <DialogContent
        className="cf-inspect cf-card-inspection"
        data-related={cards.length > 1}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            navigate(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{current?.face.name ?? 'Card'}</DialogTitle>
          <DialogDescription>
            {current?.card
              ? `${words(current.card.zone)} · ${current.card.exhausted ? 'Exhausted' : 'Ready'} · ${current.card.damage} damage`
              : 'Card visible to you.'}
          </DialogDescription>
        </DialogHeader>
        <div className="cf-inspection-image">{current && <FaceImage face={current.face} />}</div>
        {cards.length > 1 && (
          <nav className="cf-inspection-related" aria-label="Related cards">
            <div className="cf-inspection-paging">
              <Button
                size="icon"
                variant="outline"
                disabled={index <= 0}
                aria-label="Inspect previous card"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft />
              </Button>
              <span aria-live="polite">
                {current?.relation} · {index + 1} / {cards.length}
              </span>
              <Button
                size="icon"
                variant="outline"
                disabled={index >= cards.length - 1}
                aria-label="Inspect next card"
                onClick={() => navigate(1)}
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="cf-inspection-thumbnails">
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  aria-pressed={card.id === selected}
                  aria-label={`Inspect ${card.relation.toLowerCase()} ${i + 1}: ${card.face.name}`}
                  onClick={() => inspect(card.id)}
                >
                  <FaceImage face={card.face} />
                  <small>{card.relation}</small>
                </button>
              ))}
            </div>
          </nav>
        )}
      </DialogContent>
    </Dialog>
  );
}
