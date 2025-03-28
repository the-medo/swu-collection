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

const globalSearchParams = z.object({
  // Card detail dialog
  modalCardId: z.string().optional(),

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
