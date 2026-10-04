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
    <div className="mx-auto w-full max-w-3xl space-y-4 p-2 sm:p-4">
      <Helmet title="Notifications | SWUBase" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2">
          <Bell className="h-6 w-6" /> Notifications
        </h2>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings" search={{ page: 'notifications' }}>
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {summary.data ? `${summary.data.unreadCount} unread` : 'Your inbox'}
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
      {query.isPending && <p role="status">Loading notifications…</p>}
      {query.error && !query.isFetchNextPageError && (
        <p role="alert" className="text-destructive">
          {query.error.message}{' '}
          <Button variant="link" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {query.isSuccess && !items.length && (
        <div className="rounded-lg border p-10 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">You’re all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Game invitations and activity on your decks and teams will appear here.
          </p>
        </div>
      )}
      <NotificationList items={items} onAction={mutation.mutate} disabled={mutation.isPending} />
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
