import { LeaveGameButton } from './LeaveGameButton.tsx';
import { useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useMatch, useMatchReady } from '@/api/crossfire/useMatch.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import type { MatchView } from '../../../../../shared/types/crossfire-matches.ts';
import { crossfireError, words } from './presentation.ts';
import { ToolbarButton } from './ToolbarButton.tsx';
function Sideboard({ match, sessionId }: { match: MatchView; sessionId: string }) {
  const mutation = useMatchReady(sessionId, match.currentLobbyId);
  const { data: catalog } = useCardList();
  const mine = match.ready[match.mySeat];
  const form = useForm({
    defaultValues: {
      counts: Object.fromEntries(
        match.deck.pool.map(r => [
          r.cardId,
          match.deck.mainboard.find(c => c.cardId === r.cardId)?.quantity ?? 0,
        ]),
      ),
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          kind: 'next',
          ready: true,
          mainboard: Object.entries(value.counts)
            .filter(([, n]) => n > 0)
            .map(([cardId, quantity]) => ({ cardId, quantity })),
        });
      } catch {
        /* Mutation renders the error. */
      }
    },
  });
  const count = useStore(form.store, s =>
    Object.values(s.values.counts).reduce((n, q) => n + q, 0),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Move cards between your deck and its submitted pool. Your leader and base stay fixed. Only
        you can see these choices.
      </p>
      <p>
        {count} cards in deck · Keep at least {match.deck.minimumMain}
      </p>
      <div className="max-h-[45vh] overflow-y-auto space-y-2">
        {match.deck.pool.map(row => (
          <form.Field key={row.cardId} name={`counts.${row.cardId}`}>
            {field => (
              <label className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3 rounded border p-2">
                <span className="min-w-0">
                  {catalog?.cards[row.cardId]?.name ?? words(row.cardId)}
                  <small className="block text-muted-foreground">
                    {row.quantity} in pool
                    {match.deck.unsupported.includes(row.cardId) ? ' · Not yet supported' : ''}
                  </small>
                </span>
                <Input
                  className="w-20"
                  type="number"
                  min={0}
                  max={row.quantity}
                  step={1}
                  aria-label={`Deck quantity: ${words(row.cardId)}`}
                  disabled={
                    mine || mutation.isPending || match.deck.unsupported.includes(row.cardId)
                  }
                  value={field.state.value}
                  onChange={e => field.handleChange(Number(e.target.value))}
                />
              </label>
            )}
          </form.Field>
        ))}
      </div>
      {mutation.error && <p role="alert">{crossfireError(mutation.error)}</p>}
      {mine ? (
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ kind: 'next', ready: false })}
        >
          Change my deck
        </Button>
      ) : (
        <Button disabled={mutation.isPending || count < match.deck.minimumMain || count > 120}>
          Ready for next game
        </Button>
      )}
    </form>
  );
}
export function MatchControls({
  sessionId,
  lobbyId,
  ended,
}: {
  sessionId: string;
  lobbyId: string;
  ended: boolean;
}) {
  const query = useMatch(sessionId, lobbyId),
    mutation = useMatchReady(sessionId, lobbyId);
  const [opened, setOpened] = useState(false);
  const [dismissedResult, setDismissedResult] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = opened || (ended && !dismissedResult);
  const setOpen = (value: boolean) => {
    setOpened(value);
    if (!value && ended) setDismissedResult(true);
  };
  const match = query.data;
  // Single-game rematches become available only after the current game ends.
  if (!ended && (!match || match.bestOf === 1)) return null;
  const nextId =
    match?.rematchLobbyId ??
    (match && match.currentLobbyId !== lobbyId ? match.currentLobbyId : null);
  const game = match?.games.find(g => g.lobbyId === lobbyId);
  const matchComplete = match?.bestOf === 3 && match.status === 'complete';
  const winner =
    match?.exit?.status === 'forfeit'
      ? match.exit.seat === 'p1'
        ? 'p2'
        : 'p1'
      : matchComplete
        ? match.score.p1 >= 2
          ? 'p1'
          : 'p2'
        : game?.winner;
  const resultTitle = matchComplete
    ? winner === match.mySeat
      ? 'You won the match'
      : 'Your opponent won the match'
    : game?.finished
      ? !winner
        ? 'Game drawn'
        : winner === match?.mySeat
          ? 'You won this game'
          : 'Your opponent won this game'
      : 'Game finished';
  const controlLabel =
    match?.bestOf === 3 ? `Match ${match.score.p1}–${match.score.p2}` : 'Rematch';
  return (
    <>
      <ToolbarButton
        buttonRef={trigger}
        label={controlLabel}
        icon={match?.bestOf === 3 ? <Trophy size={17} /> : <RotateCcw size={17} />}
        onClick={() => setOpen(true)}
      >
        {match?.bestOf === 3 ? `${match.score.p1}–${match.score.p2}` : null}
      </ToolbarButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cf-match-dialog max-w-xl max-h-[90dvh] overflow-y-auto"
          onCloseAutoFocus={event => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{ended ? resultTitle : 'Best of three'}</DialogTitle>
            <DialogDescription>
              {match?.exit?.status === 'forfeit'
                ? match.exit.seat === match.mySeat
                  ? 'You forfeited the match. Your game history and replays are saved.'
                  : 'Your opponent forfeited the match. Your game history and replays are saved.'
                : ended && !game?.finished
                  ? 'Saving the result. You can inspect the board while this finishes.'
                  : match?.bestOf === 3
                    ? matchComplete
                      ? 'Two wins settle the match. Play again with your original decks?'
                      : ended
                        ? 'The match continues. Sideboard before the next game; the first to two wins takes the match.'
                        : 'The first player to win two games wins the match. Sideboarding opens between games.'
                    : 'Play again with the same decks? Both players must agree to a rematch.'}
            </DialogDescription>
          </DialogHeader>
          {!match ? (
            query.error ? (
              <div className="space-y-3">
                <p role="alert">{crossfireError(query.error)}</p>
                <Button
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  Retry match details
                </Button>
              </div>
            ) : (
              <p role="status">Loading the result…</p>
            )
          ) : (
            <>
              {match.bestOf === 3 && (
                <div
                  className="cf-match-score"
                  aria-label={`Best of three score: Player 1 ${match.score.p1}, Player 2 ${match.score.p2}`}
                >
                  <span>Player 1{match.mySeat === 'p1' ? ' · You' : ''}</span>
                  <strong>
                    {match.score.p1} <span>–</span> {match.score.p2}
                  </strong>
                  <span>Player 2{match.mySeat === 'p2' ? ' · You' : ''}</span>
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                {match.games.map(game => (
                  <Link
                    key={game.lobbyId}
                    to="/crossfire/replay/$lobbyId"
                    params={{ lobbyId: game.lobbyId }}
                  >
                    Game {game.number}
                    {game.finished
                      ? game.winner
                        ? ` · Player ${game.winner === 'p1' ? '1' : '2'} won`
                        : ' · Draw'
                      : ''}
                  </Link>
                ))}
              </div>
              {nextId ? (
                <Link
                  className="rounded bg-primary text-primary-foreground px-4 py-2 text-center"
                  to="/crossfire/$lobbyId"
                  params={{ lobbyId: nextId }}
                >
                  Open {match.rematchLobbyId ? 'rematch' : 'next game'}
                </Link>
              ) : match.status === 'sideboarding' ? (
                <>
                  <p>
                    {match.ready[match.mySeat === 'p1' ? 'p2' : 'p1']
                      ? 'Your opponent is ready.'
                      : 'Waiting for your opponent to finish sideboarding.'}
                  </p>
                  <Sideboard key={match.number} match={match} sessionId={sessionId} />
                </>
              ) : match.status === 'complete' ? (
                <>
                  <p>
                    {match.bestOf === 3
                      ? 'A new best-of-three match starts at 0–0 with your original decks and the same visibility settings.'
                      : 'A rematch starts with the original submitted decks and the same visibility settings.'}{' '}
                    Both players must agree.
                  </p>
                  <p>
                    {match.rematchReady[match.mySeat === 'p1' ? 'p2' : 'p1']
                      ? 'Your opponent wants a rematch.'
                      : 'Your opponent has not agreed yet.'}
                  </p>
                  <Button
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({ kind: 'rematch', ready: !match.rematchReady[match.mySeat] })
                    }
                  >
                    {match.rematchReady[match.mySeat]
                      ? 'Cancel rematch request'
                      : 'Agree to rematch'}
                  </Button>
                </>
              ) : (
                <p>
                  {ended || match.status === 'finishing'
                    ? 'Saving the finished game…'
                    : 'Finish this game to continue the match or request a rematch.'}
                </p>
              )}
              {mutation.error && <p role="alert">{crossfireError(mutation.error)}</p>}
            </>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            {match?.bestOf === 3 && match.status !== 'complete' && !nextId && (
              <LeaveGameButton
                sessionId={sessionId}
                lobbyId={lobbyId}
                bestOf={3}
                exit={match.exit}
              />
            )}

            <Button variant="ghost" onClick={() => setOpen(false)}>
              View board
            </Button>
            <Button variant="outline" asChild>
              <Link to="/crossfire">Back to Crossfire</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
