import { Link } from '@tanstack/react-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useNotificationSummary,
  useUnreadNotifications,
  useUpdateNotification,
} from '@/api/notifications/useNotifications.ts';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { useSession } from '@/lib/auth-client.ts';
import { NotificationList } from './NotificationList.tsx';

export function NotificationBell() {
  const sessionId = useSession().data?.session.id;
  return <BellPopover key={sessionId} />;
}

function BellPopover() {
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useCallback((button: HTMLButtonElement | null) => {
    // Keep the popup inside the mobile Sheet's scroll-lock boundary.
    setPortalContainer(
      button?.closest<HTMLElement>('[data-sidebar="sidebar"][data-mobile="true"]') ?? null,
    );
  }, []);
  const { data } = useNotificationSummary();
  const { isMobile, setOpenMobile } = useSidebar();
  const unreadCount = data?.unreadCount ?? 0;
  const label = unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="iconMedium"
          className="relative shrink-0 data-[state=open]:bg-sidebar-accent"
          aria-label={label}
          title={label}
        >
          <Bell aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              aria-hidden="true"
              className="pointer-events-none absolute -right-1 -top-1 min-w-4 justify-center px-1 py-0 text-[10px] leading-4 tabular-nums"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer ?? undefined}
        aria-label="Unread notifications"
        side={isMobile ? 'top' : 'right'}
        align="end"
        sideOffset={12}
        collisionPadding={8}
        className="flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-96 max-w-[calc(100vw-1rem)] flex-col p-0"
      >
        <NotificationPreview
          onNavigate={() => {
            setOpen(false);
            setOpenMobile(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function NotificationPreview({ onNavigate }: { onNavigate: () => void }) {
  const query = useUnreadNotifications();
  const mutation = useUpdateNotification();
  const viewAllRef = useRef<HTMLAnchorElement>(null);
  const pendingFocus = useRef<{ control: HTMLElement; nextControl?: HTMLElement | null } | null>(
    null,
  );
  const items = query.data?.items ?? [];
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target || mutation.isPending || target.control.isConnected) return;
    pendingFocus.current = null;
    if (
      document.activeElement === document.body ||
      document.activeElement?.getAttribute('data-sidebar') === 'sidebar'
    ) {
      (target.nextControl?.isConnected ? target.nextControl : viewAllRef.current)?.focus();
    }
  }, [query.data, mutation.isPending]);
  const update = (input: Parameters<typeof mutation.mutate>[0]) => {
    const previousFocus = document.activeElement;
    if (previousFocus instanceof HTMLButtonElement) {
      // Restore focus after the refetched unread list removes the activated control.
      pendingFocus.current = {
        control: previousFocus,
        nextControl: previousFocus
          .closest('li')
          ?.nextElementSibling?.querySelector<HTMLElement>('button'),
      };
    }
    mutation.mutate(input);
  };

  return (
    <>
      <h3 className="m-0 shrink-0 border-b px-4 py-3 text-base">Notifications</h3>
      <div className="min-h-0 overflow-y-auto p-2">
        {query.isPending && (
          <p role="status" className="p-4 text-sm">
            Loading notifications…
          </p>
        )}
        {query.error && (
          <p role="alert" className="p-2 text-sm text-destructive">
            {query.error.message}{' '}
            <Button variant="link" size="sm" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {mutation.error && (
          <p role="alert" className="p-2 text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        {query.isSuccess && !items.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">No new notifications</p>
        )}
        {!!items.length && (
          <NotificationList
            items={items}
            onAction={update}
            disabled={mutation.isPending}
            compact
            onNavigate={onNavigate}
          />
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t p-3">
        {!!items.length && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto"
            disabled={mutation.isPending}
            onClick={() => update({ action: 'read-all' })}
          >
            <CheckCheck aria-hidden="true" /> Mark all as read
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link
            ref={viewAllRef}
            to="/notifications"
            onClick={event => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0)
                onNavigate();
            }}
          >
            View all
          </Link>
        </Button>
      </div>
    </>
  );
}
