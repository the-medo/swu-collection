import { AppRealtimeProvider } from '@/components/app/realtime/AppRealtimeProvider.tsx';
import { CrossfireInvitations } from '@/components/app/crossfire/CrossfireInvitations.tsx';
import { createRootRoute, HeadContent, Outlet, useMatchRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { LeftSidebar } from '@/components/app/navigation/LeftSidebar/LeftSidebar.tsx';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';
import { PriceFetcher } from '@/dexie';
import { z } from 'zod';
import CardDetailDialog from '@/components/app/cards/CardDetailDialog/CardDetailDialog.tsx';
import SidebarTriggerButton from '@/components/app/navigation/TopMenu/SidebarTriggerButton.tsx';
import { DeckSortField } from '../../../types/ZDeck.ts';
import { SwuAspect, SwuSet } from '../../../types/enums.ts';
import CookieConsent from '@/components/app/pages/CookieConsent.tsx';
import Footer from '@/components/app/pages/Footer.tsx';
import { metaInfoArray } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { cardStatsTabsArray } from '@/components/app/card-stats/CardStatsTabs/CardStatsTabs.tsx';
import { aspectTabOptions } from '@/components/app/card-stats/AspectCardStats/AspectCardStats.tsx';
import { UserSettingsLoader } from '@/components/app/users/UserSettingsLoader.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { CardPoolType } from '../../../shared/types/cardPools.ts';
import TournamentDetailDialog from '@/components/app/tournaments/TournamentDetailDialog/TournamentDetailDialog.tsx';

const globalSearchParams = z.object({
  // global filters
  formatId: z.number().int().positive().optional(),
  metaId: z.number().int().positive().optional(),
  homeMode: z.enum(['snapshot', 'live']).optional(),
  streamId: z.string().optional(),

  // Card detail dialog
  modalCardId: z.string().optional(),
  modalDecksForModalOpen: z.boolean().optional(),
  modalCardDecksId: z.string().optional(),
  modalCardDecksLeaderCardId: z.string().optional(),
  modalCardDecksBaseCardId: z.string().optional(),

  // Tournament detail dialog
  dialogTournamentId: z.string().optional(),

  // Deck filter params
  deckLeaders: z.array(z.string()).optional(),
  deckBase: z.string().optional(),
  deckAspects: z.array(z.enum(SwuAspect)).optional(),
  deckFormat: z.coerce.number().int().positive().optional(),
  deckSort: z
    .enum([
      DeckSortField.CREATED_AT,
      DeckSortField.UPDATED_AT,
      DeckSortField.NAME,
      DeckSortField.FORMAT,
      DeckSortField.FAVORITES,
      DeckSortField.SCORE,
    ])
    .optional(),
  deckOrder: z.enum(['asc', 'desc']).optional(),

  // Meta analysis params
  maMetaPart: z.enum(['all', 'top8', 'day2', 'top64', 'champions']).optional(),
  maMetaInfo: z.enum([...metaInfoArray]).optional(),
  maViewMode: z.enum(['chart', 'table']).optional(),
  maTournamentId: z.string().optional(),
  maTournamentGroupId: z.string().optional(),

  // Matchup analysis params
  maMatchFilter: z.enum(['all', 'day2', 'top8', 'custom']).optional(),
  maMinRound: z.coerce.number().int().positive().optional(),
  maMinPoints: z.coerce.number().int().nonnegative().optional(),
  maDisplayMode: z.enum(['winLoss', 'winrate', 'gameWinLoss', 'gameWinrate']).optional(),

  // Tournament decks
  maDeckId: z.string().optional(),
  maDeckKey: z.string().optional(),
  maDeckKeyType: z.enum([...metaInfoArray]).optional(),

  // Card statistics
  csPage: z.enum([...cardStatsTabsArray]).optional(),
  csDeckId: z.string().optional(),
  csCardMatchupView: z.string().optional(),
  csCardMatchupDataView: z.enum(['winLoss', 'winrate', 'gameWinLoss', 'gameWinrate']).optional(),
  csLeaderId: z.string().optional(),
  csBaseId: z.string().optional(),
  csLeaderId2: z.string().optional(),
  csBaseId2: z.string().optional(),
  csAspect: z.enum([...aspectTabOptions]).optional(),

  // Card statistics filters and sorters
  csSortBy: z.enum(['md', 'sb', 'total', 'avgMd', 'avgTotal', 'deckCount', 'winRate']).optional(),
  csGroupBy: z.enum(['none', 'type', 'cost', 'set']).optional(),
  csMinDeckCount: z.coerce.number().int().nonnegative().optional(),
  csCardSearch: z.string().optional(),

  // Tournament filters
  tfType: z.string().optional(),
  tfContinent: z.string().optional(),
  tfDateFrom: z.string().optional(),
  tfSort: z.string().optional(),
  tfOrder: z.enum(['asc', 'desc']).optional(),
  tfShowFuture: z.boolean().optional(),

  // Card pools
  poolSet: z.enum(SwuSet).optional(),
  poolType: z.enum(CardPoolType).optional(),
  poolCustom: z.boolean().optional(),
  poolLeader: z.string().optional(),
  poolSort: z.enum(['created_at', 'updated_at']).optional(),
  poolOrder: z.enum(['asc', 'desc']).optional(),
});
export type GlobalSearchParams = z.infer<typeof globalSearchParams>;

function RootShell() {
  const currentUser = useUser();
  const matchRoute = useMatchRoute();
  const messenger = !!matchRoute({ to: '/messages', fuzzy: true });
  const userProfile = !!matchRoute({ to: '/users/$userId', fuzzy: true });
  const teamProfile = !!matchRoute({ to: '/teams/$teamId', fuzzy: true });
  const userSettings = !!currentUser && !!matchRoute({ to: '/settings', fuzzy: false });
  const teamStatistics = !!matchRoute({ to: '/teams/$teamId/statistics', fuzzy: true });
  const immersive =
    !!matchRoute({ to: '/crossfire/$lobbyId', fuzzy: false }) ||
    !!matchRoute({ to: '/crossfire/replay/$lobbyId', fuzzy: false }) ||
    !!matchRoute({ to: '/crossfire/reports/$reportId', fuzzy: false });
  const { streamId } = Route.useSearch();
  const { open, isMobile, setOpen, setOpenMobile } = useSidebar();
  const collapseReason = streamId ? `stream:${streamId}` : teamStatistics ? 'team-statistics' : null;
  const collapsedForContext = useRef<{
    reason: string;
    isMobile: boolean;
    wasOpen: boolean;
    desktopOpen: boolean;
  } | null>(null);

  useEffect(() => {
    const previous = collapsedForContext.current;
    if (!collapseReason) {
      if (previous && (previous.isMobile || !open)) {
        setOpen(previous.wasOpen || (previous.isMobile && previous.desktopOpen));
      }

      collapsedForContext.current = null;
      return;
    }

    if (previous?.reason === collapseReason && previous.isMobile === isMobile) {
      return;
    }

    const context = {
      reason: collapseReason,
      isMobile,
      wasOpen: previous?.wasOpen ?? open,
      desktopOpen: previous?.reason === collapseReason ? previous.desktopOpen : false,
    };

    if (isMobile) {
      if (previous?.reason === collapseReason && !previous.isMobile) context.desktopOpen = open;
      // Mobile navigation uses the desktop open state for its contents, too.
      if (context.wasOpen || context.desktopOpen) setOpen(true);
      setOpenMobile(false);
    } else {
      setOpen(context.desktopOpen);
    }

    collapsedForContext.current = context;
  }, [collapseReason, isMobile, open, setOpen, setOpenMobile]);

  if (immersive)
    return (
      <main className="w-full min-w-0 h-dvh overflow-y-auto">
        <Outlet />
      </main>
    );

  return (
    <>
      <LeftSidebar />
      <main
        className={`w-full min-w-0 ${userProfile || teamProfile || userSettings ? '' : 'p-2'} ${messenger ? 'h-dvh overflow-hidden' : 'h-screen max-h-screen overflow-y-scroll'}`}
      >
        <div
          className={`flex w-full flex-col @container/main-body ${messenger ? 'h-full min-h-0' : ''}`}
        >
          <Outlet />
          <CardDetailDialog />
          <TournamentDetailDialog />
        </div>
        {!messenger && <Footer />}
        <SidebarTriggerButton />
      </main>
    </>
  );
}

export const Route = createRootRoute({
  component: () => (
    <>
      <HeadContent />
      <AppRealtimeProvider>
        <CrossfireInvitations>
          <SidebarProvider>
            <RootShell />
          </SidebarProvider>
        </CrossfireInvitations>
      </AppRealtimeProvider>
      <CookieConsent />
      <Toaster />
      <PriceFetcher />
      <UserSettingsLoader />
    </>
  ),
  validateSearch: globalSearchParams,
});
