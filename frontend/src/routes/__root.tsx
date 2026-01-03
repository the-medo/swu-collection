import { createRootRoute, Outlet } from '@tanstack/react-router';
import { LeftSidebar } from '@/components/app/navigation/LeftSidebar/LeftSidebar.tsx';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
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
import { CardPoolType } from '../../../shared/types/cardPools.ts';

const globalSearchParams = z.object({
  // global filters
  formatId: z.number().int().positive().optional(),
  metaId: z.number().int().positive().optional(),

  // Card detail dialog
  modalCardId: z.string().optional(),
  modalDecksForModalOpen: z.boolean().optional(),
  modalCardDecksId: z.string().optional(),
  modalCardDecksLeaderCardId: z.string().optional(),
  modalCardDecksBaseCardId: z.string().optional(),

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
  maMatchFilter: z.enum(['all', 'day2', 'custom']).optional(),
  maMinRound: z.coerce.number().int().positive().optional(),
  maMinPoints: z.coerce.number().int().positive().optional(),
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

export const Route = createRootRoute({
  component: () => (
    <>
      <SidebarProvider>
        <LeftSidebar />
        <main className="w-full h-screen max-h-screen overflow-y-scroll p-2">
          <div className="flex flex-col w-full @container/main-body">
            <Outlet />
            <CardDetailDialog />
          </div>
          <Footer />
          <SidebarTriggerButton />
        </main>
      </SidebarProvider>
      <CookieConsent />
      <Toaster />
      <PriceFetcher />
      <UserSettingsLoader />
    </>
  ),
  validateSearch: globalSearchParams,
});
