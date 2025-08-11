import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/components/app/admin/AdminPage';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';

export const adminPages: [string, ...string[]] = [
  'metas',
  'sets',
  'tournament-groups',
  'deck-thumbnails',
  'pq-tools',
  'special-actions',
  'card-prices',
] as const;

const searchParams = z.object({
  page: z.enum([...adminPages]).default('metas'),
});

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminPage,
  validateSearch: zodValidator(searchParams),
});
