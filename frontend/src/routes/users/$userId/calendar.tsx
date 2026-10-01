import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/users/$userId/calendar')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/users/$userId',
      params,
      search: previous => ({ ...previous, userTab: 'calendar' }),
      replace: true,
    });
  },
});
