import { zodValidator } from '@tanstack/zod-adapter';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { LeftSidebar } from '@/components/app/navigation/LeftSidebar/LeftSidebar.tsx';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';
import { z } from 'zod';
import CardDetailDialog from '@/components/app/cards/CardDetailDialog/CardDetailDialog.tsx';
import SidebarTriggerButton from '@/components/app/navigation/TopMenu/SidebarTriggerButton.tsx';
import { DeckSortField } from '../../../types/ZDeck.ts';
import { SwuAspect } from '../../../types/enums.ts';
import CookieConsent from '@/components/app/pages/CookieConsent.tsx';
import Footer from '@/components/app/pages/Footer.tsx';
import { metaInfoArray } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { cardStatsTabsArray } from '@/components/app/card-stats/CardStatsTabs/CardStatsTabs.tsx';
import { aspectTabOptions } from '@/components/app/card-stats/AspectCardStats/AspectCardStats.tsx';

const globalSearchParams = z.object({
  // global filters
  formatId: z.number().int().positive().optional(),
  metaId: z.number().int().positive().optional(),

  // Card detail dialog
  modalCardId: z.string().optional(),
  modalCardDecksId: z.string().optional(),
  modalCardDecksLeaderCardId: z.string().optional(),
  modalCardDecksBaseCardId: z.string().optional(),

  // Deck filter params
  deckLeaders: z.array(z.string()).optional(),
  deckBase: z.string().optional(),
  deckAspects: z.array(z.nativeEnum(SwuAspect)).optional(),
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
  maMetaPart: z.enum(['all', 'top8', 'day2', 'top64']).optional(),
  maMetaInfo: z.enum([...metaInfoArray]).optional(),
  maViewMode: z.enum(['chart', 'table']).optional(),
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
  csCardMatchupView: z.string().optional(),
  csLeaderId: z.string().optional(),
  csBaseId: z.string().optional(),
  csLeaderId2: z.string().optional(),
  csBaseId2: z.string().optional(),
  csAspect: z.enum([...aspectTabOptions]).optional(),

  // Card statistics filters and sorters
  csSortBy: z.enum(['md', 'sb', 'total', 'avgMd', 'avgTotal', 'deckCount', 'winRate']).optional(),
  csGroupBy: z.enum(['none', 'type', 'cost']).optional(),
  csMinDeckCount: z.coerce.number().int().nonnegative().optional(),
  csCardSearch: z.string().optional(),

  // Tournament filters
  tfType: z.string().optional(),
  tfContinent: z.string().optional(),
  tfDateFrom: z.string().optional(),
  tfSort: z.string().optional(),
  tfOrder: z.enum(['asc', 'desc']).optional(),
  tfShowFuture: z.boolean().optional(),
});
export type GlobalSearchParams = z.infer<typeof globalSearchParams>;

export const Route = createRootRoute({
  component: () => (
    <>
      <SidebarProvider>
        <LeftSidebar />
        <main className="w-full h-[100vh] max-h-[100vh] overflow-y-scroll p-2">
          <div className="flex flex-col w-full">
            <Outlet />
            <CardDetailDialog />
          </div>
          <Footer />
          <SidebarTriggerButton />
        </main>
      </SidebarProvider>
      <CookieConsent />
      <Toaster />
    </>
  ),
  validateSearch: zodValidator(globalSearchParams),
});
