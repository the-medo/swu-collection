import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MessagesPage } from '@/components/app/messages/MessagesPage.tsx';

export const Route = createFileRoute('/_authenticated/messages')({
  validateSearch: z.object({ with: z.string().min(1).max(128).optional() }),
  component: MessagesPage,
});
