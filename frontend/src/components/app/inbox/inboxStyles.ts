// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const inboxStyles = {
  page: 'inbox-page [&_p]:m-0 [&_p]:leading-[1.5]!',
  preview:
    'inbox-preview [&_p]:m-0 [&_p]:leading-[1.5]! [&_.workspace-heading]:border-[color:var(--workspace-border)]!',
  header: [
    'inbox-header flex flex-wrap items-center gap-y-2.5 gap-x-4 shrink-0 mb-3 [&_.workspace-title]:flex-1',
    'max-mobile:gap-2 max-mobile:[&_.workspace-tabs]:order-3',
    'max-mobile:[&_.workspace-tabs]:w-full max-mobile:[&_.workspace-tab]:flex-1',
  ].join(' '),
  conversationList:
    'conversation-list bg-card [&_.workspace-heading]:border-[color:var(--workspace-border)]!',
  conversationLink: [
    'conversation-link relative flex min-w-0 gap-3 py-3.5 px-3 border-b border-b-[color:var(--workspace-border)]',
    'transition-[background] duration-120 ease-[ease] hover:bg-muted/50',
    "aria-[current=page]:bg-[var(--workspace-soft)] [&[aria-current=page]::before]:content-['']",
    '[&[aria-current=page]::before]:absolute [&[aria-current=page]::before]:top-0',
    '[&[aria-current=page]::before]:right-auto [&[aria-current=page]::before]:bottom-0',
    '[&[aria-current=page]::before]:left-0 [&[aria-current=page]::before]:w-0.75',
    '[&[aria-current=page]::before]:bg-[var(--workspace-accent)] focus-visible:outline-[2px]',
    'focus-visible:outline-[color:var(--workspace-accent)] focus-visible:-outline-offset-2',
  ].join(' '),
  messageAvatar: 'message-avatar bg-[var(--workspace-soft)] text-[color:var(--workspace-accent)]',
  messageScroll: 'message-scroll bg-muted/18',
  messageBubble:
    'message-bubble border border-[color:var(--workspace-border)] bg-card rounded-[0.75rem_0.75rem_0.75rem_0.25rem]',
  messageBubbleOwn:
    'message-bubble-own bg-[var(--workspace-soft)] rounded-[0.75rem_0.75rem_0.25rem_0.75rem]',
  messageComposer: [
    'message-composer bg-card [&_textarea]:border-[color:var(--workspace-border)] [&_textarea]:bg-background',
    '[&_textarea]:rounded-[0.625rem] [&_textarea]:shadow-none',
  ].join(' '),
  notificationList: 'notification-list m-0 p-0 list-none',
  notificationRow: [
    'notification-row relative flex items-center gap-3 p-3.5 border-b border-b-[color:var(--workspace-border)]',
    'last:border-b-0 data-[unread=true]:bg-[color-mix(in_srgb,var(--workspace-soft)_70%,hsl(var(--card)))]',
    "[&[data-unread=true]::before]:content-[''] [&[data-unread=true]::before]:absolute",
    '[&[data-unread=true]::before]:top-0 [&[data-unread=true]::before]:right-auto',
    '[&[data-unread=true]::before]:bottom-0 [&[data-unread=true]::before]:left-0',
    '[&[data-unread=true]::before]:w-0.75 [&[data-unread=true]::before]:bg-[var(--workspace-accent)]',
    'max-mobile:gap-2 max-mobile:p-3',
  ].join(' '),
  notificationIcon: [
    'notification-icon grid place-items-center shrink-0 w-8 h-8 rounded-[0.625rem] bg-muted text-muted-foreground',
    '[.notification-row[data-unread=true]_&]:bg-[var(--workspace-soft)]',
    '[.notification-row[data-unread=true]_&]:text-[color:var(--workspace-accent)] max-mobile:w-7 max-mobile:h-7',
  ].join(' '),
  notificationTime: [
    'notification-time [.notification-row_&]:flex [.notification-row_&]:items-center [.notification-row_&]:gap-1.5',
    '[.notification-row_&]:mt-1.5 [.notification-row_&]:text-[length:0.6875rem]',
    '[.notification-row_&]:text-muted-foreground',
  ].join(' '),
  notificationUnreadDot:
    'notification-unread-dot w-1.25 h-1.25 rounded-full bg-[var(--workspace-accent)]',
  notificationActions:
    'notification-actions flex shrink-0 gap-0.5 [.notification-compact_&]:ml-auto max-mobile:flex-col max-mobile:[.notification-compact_&]:flex-row',
  notificationCompact: 'notification-compact flex-wrap gap-1 p-3',
  notificationContent: 'notification-content [.notification-compact_&]:basis-full',
} as const;
