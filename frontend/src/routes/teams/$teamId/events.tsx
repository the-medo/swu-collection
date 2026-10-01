import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/teams/$teamId/events')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/teams/$teamId',
      params,
      search: previous => ({ ...previous, teamTab: 'events' }),
      replace: true,
    });
  },
});
