import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { ArrowLeft, ArrowRight, Check, Layers, LockKeyhole, RotateCcw } from 'lucide-react';
import { useMatchReady } from '@/api/crossfire/useMatch.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import type { MatchView } from '../../../../../shared/types/crossfire-matches.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './CrossfireDialog.tsx';
import { FaceImage } from './GameCard.tsx';
import { crossfireError, words } from './presentation.ts';

type Board = 'main' | 'side';

/** Kept mounted while inspecting the result/board so the private draft survives. */
export function Sideboard({
  match,
  sessionId,
  open,
  onOpenChange,
  onResult,
  onViewBoard,
  returnFocus,
}: {
  match: MatchView;
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: () => void;
  onViewBoard: () => void;
  returnFocus: () => void;
}) {
  const mutation = useMatchReady(sessionId, match.currentLobbyId);
  const { data: catalog } = useCardList();
  const mine = match.ready[match.mySeat];
  const opponentReady = match.ready[match.mySeat === 'p1' ? 'p2' : 'p1'];
  const savedCounts = Object.fromEntries(
    match.deck.pool.map(row => [
      row.cardId,
      match.deck.mainboard.find(card => card.cardId === row.cardId)?.quantity ?? 0,
    ]),
  );
  // Withdrawing readiness makes the API return the original game deck again.
  // Keep the editor's starting point independent of those polling responses.
  const [resetCounts, setResetCounts] = useState(savedCounts);
  const form = useForm({
    defaultValues: { counts: resetCounts },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          kind: 'next',
          ready: true,
          mainboard: Object.entries(value.counts)
            .filter(([, quantity]) => quantity > 0)
            .map(([cardId, quantity]) => ({ cardId, quantity })),
        });
        setResetCounts(value.counts);
      } catch {
        /* The mutation error is rendered beside the confirmation. */
      }
    },
  });
  const draft = useStore(form.store, state => state.values.counts);
  // Readiness may have been submitted in another tab. Always show the saved deck then.
  const counts = mine ? savedCounts : draft;
  const mainCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const total = match.deck.pool.reduce((sum, row) => sum + row.quantity, 0);
  const minimum = match.deck.minimumMain;
  const unsupportedMain = match.deck.unsupported.some(id => counts[id] > 0);
  const valid = mainCount >= minimum && mainCount <= 120 && !unsupportedMain;
  const locked = mine || mutation.isPending;
  const [move, setMove] = useState<{ message: string; focus?: string }>();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    if (move?.focus) buttons.current.get(move.focus)?.focus();
  }, [move]);
  const nameOf = (id: string) => catalog?.cards[id]?.name ?? words(id);
  const groupOf = (id: string) => {
    const card = catalog?.cards[id];
    if (card?.type === 'Unit') {
      if (card.arenas.includes('Ground')) return 'Ground';
      if (card.arenas.includes('Space')) return 'Space';
    }
    if (card?.type === 'Event') return 'Events';
    if (card?.type === 'Upgrade') return 'Upgrades';
    return 'Other';
  };
  const rows = [...match.deck.pool].sort(
    (a, b) =>
      Number(catalog?.cards[a.cardId]?.cost ?? 0) - Number(catalog?.cards[b.cardId]?.cost ?? 0) ||
      nameOf(a.cardId).localeCompare(nameOf(b.cardId)),
  );
  function transfer(cardId: string, from: Board, quantity: number) {
    if (locked || (from === 'side' && match.deck.unsupported.includes(cardId))) return;
    const to = from === 'main' ? 'side' : 'main';
    const next = counts[cardId] + (from === 'main' ? -1 : 1);
    form.setFieldValue(`counts.${cardId}`, next);
    setMove({
      message: `Moved one ${nameOf(cardId)} to ${to === 'main' ? 'main deck' : 'sideboard'}. ${next} in main deck; ${mainCount + (from === 'main' ? -1 : 1)} cards in your deck.`,
      focus: quantity === 1 ? `${to}:${cardId}` : undefined,
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cf-sideboard-dialog"
        onCloseAutoFocus={event => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <form
          className="cf-sideboard-form"
          onSubmit={event => {
            event.preventDefault();
            if (!locked && valid) void form.handleSubmit();
          }}
        >
          <div className="cf-sideboard-top">
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={onResult}>
                <ArrowLeft size={15} /> Match result
              </Button>
              <DialogHeader>
                <DialogTitle>
                  Sideboarding <span>Game {match.number + 1}</span>
                </DialogTitle>
                <DialogDescription>
                  Click a card to move one copy between your main deck and sideboard.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="cf-sideboard-identity">
              {[match.deck.leader, match.deck.base].map(id => (
                <div key={id} title={nameOf(id)}>
                  <FaceImage face={{ cardId: id, name: nameOf(id), side: 'front' }} />
                </div>
              ))}
              <span>
                <LockKeyhole size={12} /> Leader &amp; base fixed
              </span>
            </div>
          </div>
          <div className="cf-sideboard-boards">
            {(['main', 'side'] as const).map(board => {
              const count = board === 'main' ? mainCount : total - mainCount;
              const visible = rows.filter(row =>
                board === 'main' ? counts[row.cardId] > 0 : row.quantity > counts[row.cardId],
              );
              const groups =
                board === 'main' && catalog
                  ? ['Ground', 'Space', 'Events', 'Upgrades', 'Other']
                      .map(name => ({
                        name,
                        cards: visible.filter(row => groupOf(row.cardId) === name),
                      }))
                      .filter(group => group.cards.length > 0)
                  : [{ name: undefined, cards: visible }];
              return (
                <section
                  className={`cf-sideboard-board cf-sideboard-${board}`}
                  key={board}
                  aria-label={board === 'main' ? 'Main deck' : 'Sideboard'}
                >
                  <header>
                    <div>
                      <Layers size={18} />
                      <h3>{board === 'main' ? 'Main deck' : 'Sideboard'}</h3>
                      <strong>{count}</strong>
                    </div>
                    <p>
                      {board === 'main'
                        ? `At least ${minimum} cards · Click to side out`
                        : 'Click to add to your main deck'}
                    </p>
                  </header>
                  <div className="cf-sideboard-content">
                    {groups.map(group => (
                      <div className="cf-sideboard-group" key={group.name ?? board}>
                        {group.name && (
                          <h4>
                            {group.name}{' '}
                            <span>
                              {group.cards.reduce((sum, row) => sum + counts[row.cardId], 0)}
                              <span className="sr-only"> cards</span>
                            </span>
                          </h4>
                        )}
                        <div className="cf-sideboard-cards">
                          {group.cards.map(row => {
                            const quantity =
                              board === 'main'
                                ? counts[row.cardId]
                                : row.quantity - counts[row.cardId];
                            const unsupported =
                              board === 'side' && match.deck.unsupported.includes(row.cardId);
                            const name = nameOf(row.cardId);
                            return (
                              <button
                                type="button"
                                key={row.cardId}
                                ref={node => {
                                  if (node) buttons.current.set(`${board}:${row.cardId}`, node);
                                  else buttons.current.delete(`${board}:${row.cardId}`);
                                }}
                                className="cf-sideboard-card"
                                aria-disabled={locked || unsupported}
                                aria-label={`Move ${name} to ${board === 'main' ? 'sideboard' : 'main deck'}, ${quantity} ${quantity === 1 ? 'copy' : 'copies'} in ${board === 'main' ? 'main deck' : 'sideboard'}`}
                                title={unsupported ? 'Not yet supported in Crossfire' : undefined}
                                data-quantity={quantity}
                                onClick={() => transfer(row.cardId, board, quantity)}
                              >
                                <span className="cf-sideboard-art">
                                  <FaceImage face={{ cardId: row.cardId, name, side: 'front' }} />
                                </span>
                                <span className="cf-sideboard-quantity">×{quantity}</span>
                                {unsupported && (
                                  <span className="cf-sideboard-unsupported">
                                    Not yet supported
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!visible.length && (
                      <p className="cf-sideboard-empty">
                        {board === 'side'
                          ? 'No cards in your sideboard. Click a main-deck card to move it here.'
                          : 'Your main deck is empty. Add cards from your sideboard.'}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <footer className="cf-sideboard-footer">
            <div className="cf-sideboard-status">
              <strong className={!valid ? 'cf-sideboard-invalid' : undefined}>
                {mine ? (
                  <>
                    <Check size={16} /> You’re ready for game {match.number + 1}
                  </>
                ) : mainCount < minimum ? (
                  `Add ${minimum - mainCount} more ${minimum - mainCount === 1 ? 'card' : 'cards'} to your main deck`
                ) : mainCount > 120 ? (
                  'Remove cards to keep at most 120 in your main deck'
                ) : unsupportedMain ? (
                  'Move unsupported cards out of your main deck'
                ) : (
                  `${mainCount} cards · Your deck is ready to submit`
                )}
              </strong>
              <span>{opponentReady ? 'Your opponent is ready.' : 'Opponent is sideboarding.'}</span>
              <span className="sr-only" role="status">
                {move?.message}
              </span>
              {mutation.error && <p role="alert">{crossfireError(mutation.error)}</p>}
            </div>
            <div className="cf-sideboard-actions">
              {!mine && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={locked}
                  onClick={() => {
                    form.reset({ counts: resetCounts });
                    setMove({ message: 'Deck changes reset.' });
                  }}
                >
                  <RotateCcw size={15} /> Reset changes
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onViewBoard}>
                View board
              </Button>
              {mine ? (
                <Button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setResetCounts(savedCounts);
                    form.reset({ counts: savedCounts });
                    mutation.mutate({ kind: 'next', ready: false });
                  }}
                >
                  Change my deck
                </Button>
              ) : (
                <Button type="submit" disabled={mutation.isPending || !valid}>
                  {mutation.isPending ? 'Saving deck…' : 'Ready for next game'}{' '}
                  <ArrowRight size={17} />
                </Button>
              )}
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
