import { inboxStyles } from '@/components/app/inbox/inboxStyles';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Bell, MessagesSquare } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function InboxHeader({
  page,
  actions,
}: {
  page: 'messages' | 'notifications';
  actions?: ReactNode;
}) {
  const Icon = page === 'messages' ? MessagesSquare : Bell;
  return (
    <header className={inboxStyles.header}>
      <h1 className={cn('flex items-center gap-2', workspaceStyles.title)}>
        <Icon size={21} className="text-primary" aria-hidden="true" />
        {page === 'messages' ? 'Messages' : 'Notifications'}
      </h1>
      <nav className={workspaceStyles.tabs} aria-label="Inbox">
        <Link
          className={workspaceStyles.tab}
          to="/messages"
          aria-current={page === 'messages' ? 'page' : undefined}
        >
          <MessagesSquare size={15} aria-hidden="true" /> Messages
        </Link>
        <Link
          className={workspaceStyles.tab}
          to="/notifications"
          aria-current={page === 'notifications' ? 'page' : undefined}
        >
          <Bell size={15} aria-hidden="true" /> Notifications
        </Link>
      </nav>
      {actions}
    </header>
  );
}
