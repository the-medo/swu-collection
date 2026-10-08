import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';

export const Route = createFileRoute('/_authenticated/shop')({ component: ShopRedirect });

function ShopRedirect() {
  const owner = useUser();
  return owner ? (
    <Navigate
      to="/users/$userId"
      params={{ userId: owner.id }}
      search={previous => ({ ...previous, userTab: 'currencies', currencyPage: 'shop' })}
      replace
    />
  ) : null;
}
