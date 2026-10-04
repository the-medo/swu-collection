import { createFileRoute } from '@tanstack/react-router';
import { NotificationsPage } from '@/components/app/notifications/NotificationsPage.tsx';

export const Route = createFileRoute('/_authenticated/notifications')({
  component: NotificationsPage,
});
