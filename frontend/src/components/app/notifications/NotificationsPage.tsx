import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { inboxStyles } from '@/components/app/inbox/inboxStyles';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import {
  useNotifications,
  useNotificationSummary,
  useUpdateNotification,
} from '@/api/notifications/useNotifications.ts';
import { Button } from '@/components/ui/button.tsx';
import { useSession } from '@/lib/auth-client.ts';
import { Helmet } from 'react-helmet-async';
import { NotificationList } from './NotificationList.tsx';
import { InboxHeader } from '@/components/app/inbox/InboxHeader.tsx';
import { useInfiniteQueryScroll } from '@/hooks/useInfiniteQueryScroll.ts';

export function NotificationsPage() {
  const sessionId = useSession().data?.session.id;
  return <Inbox key={sessionId} />;
}
function Inbox() {
  const query = useNotifications();
  const summary = useNotificationSummary();
  const mutation = useUpdateNotification();
  const { observerTarget } = useInfiniteQueryScroll({
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage && !query.isFetchNextPageError,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isFetching,
  });
  const items = [
    ...new Map(
      query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? [],
    ).values(),
  ];
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-5xl space-y-3 p-2 sm:p-3',
        workspaceStyles.theme,
        inboxStyles.page,
      )}
    >
      <Helmet title="Notifications | SWUBase" />
      <InboxHeader
        page="notifications"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings" search={{ page: 'notifications' }}>
              <Settings className="h-4 w-4" aria-hidden="true" /> Settings
            </Link>
          </Button>
        }
      />
      <div className={cn('overflow-hidden', workspaceStyles.panel)}>
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {summary.data ? (
              <>
                <strong className="font-semibold text-foreground">
                  {summary.data.unreadCount}
                </strong>{' '}
                unread
              </>
            ) : (
              'Your inbox'
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!summary.data?.unreadCount || mutation.isPending}
            onClick={() => mutation.mutate({ action: 'read-all' })}
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        </div>
        {query.isPending && (
          <p className="p-4 text-sm text-muted-foreground" role="status">
            Loading notifications…
          </p>
        )}
        {query.error && !query.isFetchNextPageError && (
          <p role="alert" className="p-3 text-sm text-destructive">
            {query.error.message}{' '}
            <Button variant="link" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {mutation.error && (
          <p role="alert" className="p-3 text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        {query.isSuccess && !items.length && (
          <div className="p-8 text-center">
            <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">You’re all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Game invitations and activity on your decks and teams will appear here.
            </p>
          </div>
        )}
        <NotificationList
          items={items}
          onAction={input => mutation.mutate(input)}
          disabled={mutation.isPending}
        />
      </div>
      <div
        ref={observerTarget}
        role="status"
        className="h-8 text-center text-sm text-muted-foreground"
      >
        {query.isFetchingNextPage && 'Loading more notifications…'}
      </div>
      {query.isFetchNextPageError && (
        <div role="alert" className="text-center text-sm text-destructive">
          Could not load more notifications.{' '}
          <Button variant="link" onClick={() => void query.fetchNextPage()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
