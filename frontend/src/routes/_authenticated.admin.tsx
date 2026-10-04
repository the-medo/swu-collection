import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/components/app/admin/AdminPage';
import { z } from 'zod';

import { adminPageIds } from '@/components/app/admin/adminNavigation';

const searchParams = z.object({
  page: z.enum(adminPageIds).default('metas'),
  reportId: z.uuid().optional().catch(undefined),
  reportUserId: z.string().min(1).max(200).optional().catch(undefined),
  reportStatus: z.enum(['open', 'resolved', 'all']).default('open').catch('open'),
  reportPage: z.coerce.number().int().min(1).max(100000).default(1).catch(1),
  resourceStatus: z.enum(['all', 'pending', 'approved']).default('all').catch('all'),
  resourceSearch: z.string().max(200).optional().catch(undefined),
  tournamentId: z.uuid().optional(),
  view: z.enum(['standings', 'rounds']).default('standings'),
  round: z.coerce.number().int().nonnegative().optional(),
});

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminPage,
  validateSearch: searchParams,
});
