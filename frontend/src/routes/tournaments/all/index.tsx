import { competitionStyles } from '@/components/app/tournaments/competitionStyles';
import { cn } from '@/lib/utils';
import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import TournamentsAll from '@/components/app/tournaments/pages/TournamentsAll/TournamentsAll.tsx';

export const Route = createFileRoute('/tournaments/all/')({
  component: TournamentsAllPage,
});

function TournamentsAllPage() {
  return (
    <>
      <Helmet title="All Tournaments | SWUBase" />
      <div className={cn('p-2', competitionStyles.page)}>
        <TournamentsAll />
      </div>
    </>
  );
}
