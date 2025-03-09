import { zodValidator } from '@tanstack/zod-adapter';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { LeftSidebar } from '@/components/app/navigation/LeftSidebar/LeftSidebar.tsx';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar.tsx';
import { Toaster } from '@/components/ui/toaster.tsx';
import { ModeToggle } from '@/components/ui/mode-toggle.tsx';
import { z } from 'zod';
import CardDetailDialog from '@/components/app/cards/CardDetailDialog/CardDetailDialog.tsx';

const globalSearchParams = z.object({
  modalCardId: z.string().optional(),
});

export const Route = createRootRoute({
  component: () => (
    <>
      <SidebarProvider>
        <LeftSidebar />
        <main className="w-full p-2">
          <div className="flex gap-2 pb-2">
            <SidebarTrigger />
            <ModeToggle />
          </div>
          <Outlet />
        </main>
        <Toaster />
      </SidebarProvider>
      <CardDetailDialog />
    </>
  ),
  validateSearch: zodValidator(globalSearchParams),
});
