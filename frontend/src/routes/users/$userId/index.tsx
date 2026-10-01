import { createFileRoute } from '@tanstack/react-router';
import UserDetail from '@/components/app/users/UserDetail/UserDetail.tsx';
import { z } from 'zod';

export const Route = createFileRoute('/users/$userId/')({
  component: RouteComponent,
  validateSearch: z.object({
    userTab: z.enum(['decks', 'collections', 'wantlists', 'calendar']).optional(),
  }),
});

function RouteComponent() {
  return <UserDetail />;
}
