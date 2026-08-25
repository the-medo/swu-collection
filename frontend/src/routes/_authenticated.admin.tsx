import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/components/app/admin/AdminPage';
import { z } from 'zod';

const adminPages: [string, ...string[]] = [
  'metas',
  'sets',
  'tournament-groups',
  'tournament-weekends',
  'deck-thumbnails',
  'pq-tools',
  'special-actions',
  'card-prices',
  'variant-checker',
  'preview-cards',
  'tournament-results',
] as const;

const searchParams = z.object({
  page: z.enum([...adminPages]).default('metas'),
  tournamentId: z.uuid().optional(),
  view: z.enum(['standings', 'rounds']).default('standings'),
  round: z.coerce.number().int().nonnegative().optional(),
});

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminPage,
  validateSearch: searchParams,
});
