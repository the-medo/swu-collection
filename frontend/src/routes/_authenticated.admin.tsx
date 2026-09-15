import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/components/app/admin/AdminPage';
import { z } from 'zod';

import { adminPageIds } from '@/components/app/admin/adminNavigation';

const searchParams = z.object({
  page: z.enum(adminPageIds).default('metas'),
  tournamentId: z.uuid().optional(),
  view: z.enum(['standings', 'rounds']).default('standings'),
  round: z.coerce.number().int().nonnegative().optional(),
});

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminPage,
  validateSearch: searchParams,
});
