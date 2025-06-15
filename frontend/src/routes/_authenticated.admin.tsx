import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/components/app/admin/AdminPage';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';

const searchParams = z.object({
  page: z
    .enum(['metas', 'sets', 'tournament-groups', 'deck-thumbnails', 'pq-tools'])
    .default('metas'),
});

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminPage,
  validateSearch: zodValidator(searchParams),
});
