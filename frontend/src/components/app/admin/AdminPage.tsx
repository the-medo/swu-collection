import { CrossfireAccessPage } from './CrossfireAccessPage';
import { CrossfireCardsPage } from './CrossfireCardsPage';
import { Card, CardContent } from '@/components/ui/card';
import { useRole } from '@/hooks/useRole';
import { Navigate, useSearch } from '@tanstack/react-router';
import { MetaTable } from './MetaTable';
import { SetsPage } from './SetsPage';
import { ThumbnailsPage } from '@/components/app/admin/ThumbnailsPage.tsx';
import { TournamentGroupsPage } from '@/components/app/admin/TournamentGroupsPage';
import { TournamentWeekendsPage } from '@/components/app/admin/TournamentWeekendsPage';
import { PQToolsPage } from '@/components/app/admin/PQToolsPage/PQToolsPage.tsx';
import { SpecialActionsPage } from '@/components/app/admin/SpecialActionsPage';
import { CardPricePairingAdministrationPage } from '@/components/app/admin/CardPricesPage/CardPricePairingAdministrationPage.tsx';
import VariantCheckerPage from '@/components/app/admin/VariantCheckerPage/VariantCheckerPage.tsx';
import { PreviewCardsPage } from '@/components/app/admin/PreviewCardsPage.tsx';
import { TournamentResultsPage } from '@/components/app/admin/TournamentResultsPage/TournamentResultsPage.tsx';
import { Helmet } from 'react-helmet-async';
import { AdminNavigation } from './AdminNavigation';
import { adminSections } from './adminNavigation';

export function AdminPage() {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');
  const { page, tournamentId, view, round } = useSearch({ from: '/_authenticated/admin' });
  const section = adminSections.find(section => section.items.some(item => item.id === page))!;
  const current = section.items.find(item => item.id === page)!;

  // Redirect if not an admin
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <Helmet title="Admin dashboard | SWUBase" />
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
          <h1 className="text-xl font-semibold">Administration</h1>
          <span className="text-sm text-muted-foreground">
            {section.title} / {current.label}
          </span>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <AdminNavigation page={page} />
          <Card className="min-w-0" key={page}>
            <CardContent className="p-4">
              {page === 'crossfire-access' && <CrossfireAccessPage />}
              {page === 'crossfire-cards' && <CrossfireCardsPage />}
              {page === 'metas' && <MetaTable />}
              {page === 'sets' && <SetsPage />}
              {page === 'tournament-groups' && <TournamentGroupsPage />}
              {page === 'tournament-weekends' && <TournamentWeekendsPage />}
              {page === 'deck-thumbnails' && <ThumbnailsPage />}
              {page === 'pq-tools' && <PQToolsPage />}
              {page === 'special-actions' && <SpecialActionsPage />}
              {page === 'card-prices' && <CardPricePairingAdministrationPage />}
              {page === 'variant-checker' && <VariantCheckerPage />}
              {page === 'preview-cards' && <PreviewCardsPage />}
              {page === 'tournament-results' && (
                <TournamentResultsPage tournamentId={tournamentId} view={view} round={round} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
