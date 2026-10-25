import { competitionStyles } from '@/components/app/tournaments/competitionStyles';
import { cn } from '@/lib/utils';
import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import TournamentsFeatured from '@/components/app/tournaments/pages/TournamentsFeatured/TournamentsFeatured.tsx';

export const Route = createFileRoute('/tournaments/featured/')({
  component: TournamentsFeaturedPage,
});

function TournamentsFeaturedPage() {
  return (
    <>
      <Helmet title="Featured Tournaments | SWUBase" />
      <div className={cn('p-2', competitionStyles.page)}>
        <TournamentsFeatured />
      </div>
    </>
  );
}
