import { createFileRoute } from '@tanstack/react-router';
import UserDetail from '@/components/app/users/UserDetail/UserDetail.tsx';
import { z } from 'zod';

export const Route = createFileRoute('/users/$userId/')({
  component: RouteComponent,
  validateSearch: z
    .object({
      userTab: z
        .enum([
          'decks',
          'collections',
          'wantlists',
          'calendar',
          'tournaments',
          'reports',
          'currencies',
          'transactions',
        ])
        .optional(),
      currencyPage: z.enum(['about', 'shop', 'transactions']).optional().catch(undefined),
    })
    .transform(search => ({
      ...search,
      userTab: search.userTab === 'transactions' ? ('currencies' as const) : search.userTab,
      // Preserve existing bookmarks to the former Transactions profile section.
      currencyPage:
        search.currencyPage ??
        (search.userTab === 'transactions' ? ('transactions' as const) : undefined),
    })),
});

function RouteComponent() {
  return <UserDetail />;
}
