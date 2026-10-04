import { Link } from '@tanstack/react-router';
import { Mail, MailOpen } from 'lucide-react';
import { useMessageSummary } from '@/api/messages/useMessages.ts';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

export function MessageBadge() {
  const { data } = useMessageSummary();
  const { setOpenMobile } = useSidebar();
  const count = data?.unreadCount ?? 0;
  const label = count ? `Messages, ${count} unread` : 'Messages';
  const Icon = count ? Mail : MailOpen;
  return (
    <Button asChild variant="ghost" size="iconMedium" className="relative shrink-0" title={label}>
      <Link
        to="/messages"
        search={{ with: undefined }}
        aria-label={label}
        onClick={event => {
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0)
            setOpenMobile(false);
        }}
      >
        <Icon aria-hidden="true" />
        {count > 0 && (
          <Badge
            aria-hidden="true"
            className="pointer-events-none absolute -right-1 -top-1 min-w-4 justify-center px-1 py-0 text-[10px] leading-4 tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
