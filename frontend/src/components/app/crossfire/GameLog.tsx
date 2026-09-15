import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@tanstack/react-store';
import type { ChatMessage } from '../../../../../play/view/chat.ts';
import type { CrossfireConnection } from './connection.ts';
import { GameChat } from './GameChat.tsx';
import { mergeActivity } from './activity.ts';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import type { GameView } from '../../../../../play/view/types.ts';
import { playerName, words } from './presentation.ts';
import { useCardInspection } from './useCardInspection.ts';

function LogCardReference({
  id,
  name,
  highlight,
  inspect,
}: {
  id: string;
  name: string;
  highlight: (ids: string[]) => void;
  inspect: (id: string) => void;
}) {
  const inspection = useCardInspection(id, inspect);
  return (
    <button
      type="button"
      data-card-reference={id}
      className="underline decoration-dotted underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
      {...inspection}
      onMouseEnter={() => highlight([id])}
      onMouseLeave={() => highlight([])}
      onFocus={() => highlight([id])}
      onBlur={() => highlight([])}
      onClick={() => highlight([id])}
    >
      {name}
    </button>
  );
}
export function GameLog({
  view,
  seat,
  highlight,
  inspect,
  chat = [],
  composer,
}: {
  chat?: ChatMessage[];
  composer?: ReactNode;
  view: GameView;
  seat?: string;
  highlight: (ids: string[]) => void;
  inspect: (id: string) => void;
}) {
  const entries = mergeActivity(view.events, chat);
  const actorColor = (actor: string | null) =>
    !actor ? 'system' : actor === (seat ?? 'p1') ? 'self' : 'opponent';
  const end = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    if (follow && end.current) end.current.scrollTop = end.current.scrollHeight;
  }, [view.events, chat, follow]);
  return (
    <section className="cf-log" aria-label="Game log">
      <div className="cf-log-toolbar">
        <h2 className="sr-only">Match messages</h2>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={follow} onCheckedChange={v => setFollow(v === true)} />
          Follow
        </label>
      </div>
      <div
        ref={end}
        className="cf-log-entries"
        tabIndex={0}
        aria-label="Game log entries"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!entries.length && <p className="text-muted-foreground">The game is ready to begin.</p>}
        {entries.map(entry => {
          if (entry.kind === 'chat') {
            const message = entry.message;
            return (
              <div
                key={`chat-${message.id}`}
                className="cf-activity-entry cf-chat-message"
                data-actor={actorColor(message.seat)}
                aria-label={`${playerName(message.seat, seat)} chat message`}
              >
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <p>{message.text}</p>
              </div>
            );
          }
          const event = entry.event;
          return (
            <p
              key={`event-${event.id}`}
              className="cf-activity-entry leading-relaxed"
              data-actor={actorColor(event.actor)}
              aria-label={
                event.actor ? `${playerName(event.actor, seat)} game action` : 'Game update'
              }
            >
              {words(event.type)}
              {event.amount !== null ? ` ${event.amount}` : ''}
              {event.mode ? ` · ${words(event.mode)}` : ''}
              {event.namedCard ? `: ${event.namedCard}` : ''}
              {event.cards.length > 0 && ': '}
              {event.cards.map((reference, i) => {
                const id = reference.currentCardId;
                return (
                  <span key={i}>
                    {i > 0 && ', '}
                    {id ? (
                      <LogCardReference
                        id={id}
                        name={reference.name}
                        highlight={highlight}
                        inspect={inspect}
                      />
                    ) : (
                      <span title="This copy is no longer visible on the board">
                        {reference.name}
                      </span>
                    )}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
      {composer}
    </section>
  );
}

export function ConnectedGameLog({
  connection,
  ...props
}: Omit<Parameters<typeof GameLog>[0], 'chat' | 'composer'> & { connection: CrossfireConnection }) {
  const chat = useStore(connection.store, state => state.chat);
  return <GameLog {...props} chat={chat} composer={<GameChat connection={connection} />} />;
}
