import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { FaceImage } from './GameCard.tsx';
import type { GameView, VisibleEvent } from '../../../../../play/view/types.ts';

/** Local notification only: acknowledging it never submits a game command. */
export function PlotRevealNotice({ view, seat }: { view: GameView | null; seat?: string }) {
  const [history, setHistory] = useState<{
    events: GameView['events'] | null;
    lastOrder: number | null;
    notices: VisibleEvent[];
  }>({ events: null, lastOrder: null, notices: [] });
  if (view && seat && history.events !== view.events) {
    const latest = view.events.reduce((max, e) => Math.max(max, e.order ?? 0), 0);
    const rewound = history.lastOrder !== null && latest < history.lastOrder;
    const added =
      history.lastOrder === null || rewound
        ? []
        : view.events.filter(
            e =>
              (e.order ?? 0) > history.lastOrder! &&
              e.type === 'shown' &&
              e.mode === 'plot' &&
              e.actor !== seat &&
              e.cards.length > 0,
          );
    // Public ordinals survive reconnect and handle replacement. The initial
    // snapshot establishes a baseline, so opening a game does not replay old notices.
    // Accepted undo drops the discarded suffix and permits fresh declarations.
    setHistory({
      events: view.events,
      lastOrder: latest,
      notices: rewound
        ? history.notices.filter(n => (n.order ?? 0) <= latest)
        : [...history.notices, ...added],
    });
  }
  const notice = history.notices[0];
  const dismiss = () =>
    setHistory(previous => ({ ...previous, notices: previous.notices.slice(1) }));
  return (
    <Dialog
      open={!!notice && !!seat}
      modal={false}
      onOpenChange={open => {
        if (!open) dismiss();
      }}
    >
      <DialogContent className="cf-plot-reveal-dialog">
        <DialogTitle>Opponent’s Plot cards</DialogTitle>
        <DialogDescription>
          Your opponent showed these cards and can continue resolving Plot.
        </DialogDescription>
        <div className="cf-plot-reveal-cards">
          {notice?.cards.map((card, index) => (
            <figure key={`${notice.id}-${index}`}>
              <FaceImage face={{ cardId: card.cardId, name: card.name, side: 'front' }} />
              <figcaption>{card.name}</figcaption>
            </figure>
          ))}
        </div>
        <Button className="cf-plot-notice-dismiss" onClick={dismiss}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
