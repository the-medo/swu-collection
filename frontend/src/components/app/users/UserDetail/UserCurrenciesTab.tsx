import { getRouteApi } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserShop } from '@/components/app/shop/UserShop';
import { CurrencyAbout } from './CurrencyAbout';
import { UserTransactionsTab } from './UserTransactionsTab';

const routeApi = getRouteApi('/users/$userId/');

export function UserCurrenciesTab({ userId }: { userId: string }) {
  const { currencyPage = 'about' } = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  return (
    <section id="user-currencies" aria-label="Beskar & Credits" className="scroll-mt-3 p-2 sm:p-3">
      <Tabs
        value={currencyPage}
        onValueChange={value => {
          if (value === 'about' || value === 'shop' || value === 'transactions')
            void navigate({
              search: previous => ({
                ...previous,
                userTab: 'currencies',
                currencyPage: value === 'about' ? undefined : value,
              }),
              resetScroll: false,
            });
        }}
      >
        <TabsList aria-label="Currency pages" className="mb-4 grid h-auto w-full grid-cols-3 gap-1">
          <TabsTrigger value="about" className="min-h-9 whitespace-normal">
            What is this
          </TabsTrigger>
          <TabsTrigger value="shop" className="min-h-9">
            Shop
          </TabsTrigger>
          <TabsTrigger value="transactions" className="min-h-9">
            Transactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="about">
          <CurrencyAbout />
        </TabsContent>
        {/* Keep receipts while browsing this section; a lost response must remain safe to retry. */}
        <TabsContent value="shop" forceMount className="data-[state=inactive]:hidden">
          <UserShop active={currencyPage === 'shop'} />
        </TabsContent>
        <TabsContent value="transactions">
          <UserTransactionsTab userId={userId} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
