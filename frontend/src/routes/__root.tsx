import { zodValidator } from '@tanstack/zod-adapter';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { LeftSidebar } from '@/components/app/navigation/LeftSidebar/LeftSidebar.tsx';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';
import { z } from 'zod';
import CardDetailDialog from '@/components/app/cards/CardDetailDialog/CardDetailDialog.tsx';
import SidebarTriggerButton from '@/components/app/navigation/TopMenu/SidebarTriggerButton.tsx';

const globalSearchParams = z.object({
  modalCardId: z.string().optional(),
});

export const Route = createRootRoute({
  component: () => (
    <>
      <SidebarProvider>
        <LeftSidebar />
        <main className="w-full p-2">
          <SidebarTriggerButton />
          <Outlet />
        </main>
        <Toaster />
      </SidebarProvider>
      <CardDetailDialog />
    </>
  ),
  validateSearch: zodValidator(globalSearchParams),
});
