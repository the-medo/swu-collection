import { useEffect, useId, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Archive, Gamepad2, Mail, MailOpen, MessageSquare, Star, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { NotificationItem } from '../../../../../shared/types/notifications.ts';

interface NotificationListProps {
  items: NotificationItem[];
  onAction: (input: { id: string; action: 'read' | 'unread' | 'archive' }) => void;
  disabled?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}

export function NotificationList({
  items,
  onAction,
  disabled = false,
  compact = false,
  onNavigate,
}: NotificationListProps) {
  const navigate = useNavigate();
  const listId = useId();
  const [now, setNow] = useState(Date.now);
  const nextExpiry = Math.min(
    ...items
      .filter(item => item.available && item.expiresAt && Date.parse(item.expiresAt) > now)
      .map(item => Date.parse(item.expiresAt!)),
  );
  useEffect(() => {
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(60_000, Math.max(0, nextExpiry - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [nextExpiry, now]);
  return (
    <ul aria-label="Notifications" className="divide-y divide-border">
      {items.map(item => {
        const invite = item.type === 'crossfire.invitation';
        const newMember = item.type === 'team.member.joined';
        const comment = item.type === 'deck.comment' || item.type === 'comment.reply';
        const commentUrl =
          item.targetUrl?.startsWith('/') &&
          !item.targetUrl.startsWith('//') &&
          !item.targetUrl.includes('\\')
            ? item.targetUrl
            : `/decks/${item.targetDeckId}?deckTab=article&deckComment=${item.entityId}`;

        const available =
          item.available && (!item.expiresAt || new Date(item.expiresAt).getTime() > now);
        const Icon = invite ? Gamepad2 : newMember ? Users : comment ? MessageSquare : Star;
        const descriptionId = `${listId}-${item.id}-description`;
        const createdAt = new Date(item.createdAt);
        const fullTimestamp = createdAt.toLocaleString();
        const markRead = (event: MouseEvent<HTMLAnchorElement>) => {
          if (!item.readAt) onAction({ id: item.id, action: 'read' });
          if (
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.button === 0
          )
            onNavigate?.();
        };
        const linkClassName =
          'rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
        return (
          <li
            key={item.id}
            className={cn(
              'flex flex-col gap-2 px-2 py-3',
              !compact && 'sm:flex-row sm:items-center sm:gap-4',
              !item.readAt && 'bg-primary/5',
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Icon
                aria-hidden="true"
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  item.readAt ? 'text-muted-foreground' : 'text-primary',
                )}
              />
              <p id={descriptionId} className="min-w-0 text-sm leading-6! [overflow-wrap:anywhere]">
                {!item.readAt && <span className="sr-only">Unread notification. </span>}
                {newMember && <>You have a new team member! </>}
                {item.actorUserId ? (
                  <Link
                    to="/users/$userId"
                    params={{ userId: item.actorUserId }}
                    className={linkClassName}
                    onClick={markRead}
                  >
                    {item.actorName ?? 'A player'}
                  </Link>
                ) : (
                  <span>{item.actorName ?? 'A player'}</span>
                )}
                {invite ? (
                  <>
                    {' invited you to play '}
                    {available ? (
                      <Link
                        to="/crossfire"
                        search={{ cfInvite: item.entityId }}
                        className={cn(linkClassName, 'underline')}
                        onClick={markRead}
                      >
                        Crossfire
                      </Link>
                    ) : (
                      'Crossfire'
                    )}
                    .
                    {!available && (
                      <span className="ml-2 text-xs text-muted-foreground">Invitation ended</span>
                    )}
                  </>
                ) : newMember ? (
                  <>
                    {' joined '}
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: item.entityId }}
                      className={linkClassName}
                      onClick={markRead}
                    >
                      {item.entityName ?? 'your team'}
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    {comment
                      ? item.type === 'comment.reply'
                        ? ' replied to your comment on '
                        : ' commented on '
                      : ' favorited '}
                    {comment ? (
                      <a
                        href={commentUrl}
                        className={linkClassName}
                        onClick={event => {
                          markRead(event);
                          if (
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            !event.altKey &&
                            event.button === 0
                          ) {
                            event.preventDefault();
                            void navigate({ href: commentUrl });
                          }
                        }}
                      >
                        {item.entityName ?? 'the discussion'}
                      </a>
                    ) : (
                      <Link
                        to="/decks/$deckId"
                        params={{ deckId: item.entityId }}
                        className={linkClassName}
                        onClick={markRead}
                      >
                        {item.entityName ?? 'your deck'}
                      </Link>
                    )}
                    .
                  </>
                )}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <time
                dateTime={item.createdAt}
                title={fullTimestamp}
                className="whitespace-nowrap text-xs text-muted-foreground"
              >
                {formatDistanceToNow(createdAt, { addSuffix: true })}
                <span className="sr-only"> ({fullTimestamp})</span>
              </time>
              <div className="flex items-center gap-1">
                <Button
                  size="iconMedium"
                  variant="ghost"
                  aria-label={item.readAt ? 'Mark unread' : 'Mark read'}
                  aria-describedby={descriptionId}
                  title={item.readAt ? 'Mark unread' : 'Mark read'}
                  disabled={disabled}
                  onClick={() => onAction({ id: item.id, action: item.readAt ? 'unread' : 'read' })}
                >
                  {item.readAt ? <Mail aria-hidden="true" /> : <MailOpen aria-hidden="true" />}
                </Button>
                <Button
                  size="iconMedium"
                  variant="ghost"
                  aria-label="Archive"
                  aria-describedby={descriptionId}
                  title="Archive"
                  disabled={disabled}
                  onClick={() => onAction({ id: item.id, action: 'archive' })}
                >
                  <Archive aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
