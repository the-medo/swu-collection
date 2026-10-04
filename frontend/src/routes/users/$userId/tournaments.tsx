import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/users/$userId/tournaments')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/users/$userId',
      params,
      search: previous => ({ ...previous, userTab: 'tournaments' }),
      replace: true,
    });
  },
});
