import { inboxStyles } from '@/components/app/inbox/inboxStyles';
import { useEffect, useId, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { Archive, Gamepad2, Mail, MailOpen, MessageSquare, Star, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { NotificationItem } from '../../../../../shared/types/notifications.ts';

interface NotificationListProps {
  items: NotificationItem[];
  onAction: (
    input: { id: string; action: 'read' | 'unread' | 'archive' },
    focusTarget?: HTMLElement,
  ) => void;
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
    <ul aria-label="Notifications" className={inboxStyles.notificationList}>
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
          if (!item.readAt) onAction({ id: item.id, action: 'read' }, event.currentTarget);
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
            data-notification-id={item.id}
            data-unread={!item.readAt}
            className={cn(inboxStyles.notificationRow, compact && inboxStyles.notificationCompact)}
          >
            <div
              className={cn(
                'flex min-w-0 flex-1 items-start gap-2.5',
                inboxStyles.notificationContent,
              )}
            >
              <span className={inboxStyles.notificationIcon}>
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p id={descriptionId} className="min-w-0 text-sm [overflow-wrap:anywhere]">
                  {!item.readAt && <span className="sr-only">Unread notification. </span>}
                  {newMember && <>You have a new team member! </>}
                  {item.actorUserId ? (
                    <UserDisplay
                      onPreviewLinkClick={markRead}
                      user={{
                        id: item.actorUserId,
                        displayName: item.actorName ?? 'A player',
                        image: item.actorImage,
                      }}
                    />
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
                <div className={inboxStyles.notificationTime}>
                  {!item.readAt && (
                    <span className={inboxStyles.notificationUnreadDot} aria-hidden="true" />
                  )}
                  <time dateTime={item.createdAt} title={fullTimestamp}>
                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                    <span className="sr-only"> ({fullTimestamp})</span>
                  </time>
                </div>
              </div>
            </div>
            <div className={inboxStyles.notificationActions}>
              <Button
                size="iconMedium"
                variant="ghost"
                aria-label={item.readAt ? 'Mark unread' : 'Mark read'}
                data-notification-action={item.readAt ? 'unread' : 'read'}
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
                data-notification-action="archive"
                aria-describedby={descriptionId}
                title="Archive"
                disabled={disabled}
                onClick={() => onAction({ id: item.id, action: 'archive' })}
              >
                <Archive aria-hidden="true" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
