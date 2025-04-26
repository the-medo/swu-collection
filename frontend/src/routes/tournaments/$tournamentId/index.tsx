import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/tournaments/$tournamentId/')({
  beforeLoad: ({ params }) => {
    // Redirect to the details tab by default
    throw redirect({
      to: '/tournaments/$tournamentId/details',
      params: { tournamentId: params.tournamentId },
    });
  },
});
