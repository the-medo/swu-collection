import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import TournamentCalendar from '@/components/app/tournaments/calendar/TournamentCalendar.tsx';

export const Route = createFileRoute('/_authenticated/tournaments/calendar/')({
  validateSearch: z.object({
    tcMonth: z.iso.date().optional(),
    tcView: z.enum(['month', 'agenda']).optional().catch(undefined),
  }),
  component: () => (
    <>
      <Helmet title="My tournament calendar | SWUBase" />
      <TournamentCalendar />
    </>
  ),
});
