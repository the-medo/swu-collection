import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import { CurrencyIcon } from '@/components/app/global/CurrencyIcon';
import { useShop, useShopPurchase } from '@/api/wallet/useShop';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatBeskar, SHOP_ITEMS, type ShopItemId } from '../../../../../shared/types/credits';
import type { ErrorWithStatus } from '../../../../../types/ErrorWithStatus';

type PendingPurchase = { requestId: string; uncertain: boolean };

export function UserShop({ active }: { active: boolean }) {
  const owner = useUser();
  const shop = useShop(active);
  const purchase = useShopPurchase();
  const [wasActive, setWasActive] = useState(active);
  const [selected, setSelected] = useState<ShopItemId | null>(null);
  const [requests, setRequests] = useState<Partial<Record<ShopItemId, PendingPurchase>>>({});
  const [notice, setNotice] = useState('');
  // Close the confirmation when leaving Shop while retaining receipt state for retries.
  if (wasActive !== active) {
    setWasActive(active);
    setSelected(null);
  }
  const item = SHOP_ITEMS.find(product => product.id === selected);
  const remember = (itemId: ShopItemId, request: PendingPurchase | null) =>
    setRequests(previous => {
      const next = { ...previous };
      if (request) next[itemId] = request;
      else delete next[itemId];
      return next;
    });
  const buy = async () => {
    if (!item || purchase.isPending) return;
    const attempt = requests[item.id] ?? { requestId: crypto.randomUUID(), uncertain: false };
    remember(item.id, attempt);
    await purchase
      .mutateAsync({ itemId: item.id, requestId: attempt.requestId })
      .then(result => {
        remember(item.id, null);
        setSelected(null);
        setNotice(
          `${result.applied ? 'Bought' : 'Confirmed purchase of'} an additional ${item.name.toLowerCase()}. You have ${formatBeskar(result.wallet.beskarCents)} beskar remaining.`,
        );
      })
      .catch((error: ErrorWithStatus) => {
        const rejected =
          error.status !== undefined && [400, 401, 403, 404, 409, 413].includes(error.status);
        // Even a denied retry cannot rule out an earlier committed purchase.
        remember(item.id, rejected && !attempt.uncertain ? null : { ...attempt, uncertain: true });
      });
  };
  return (
    <section aria-label="Slot shop" className="space-y-5">
      {!item && purchase.isPending && <p role="status">Completing your purchase…</p>}
      {!item && purchase.error && (
        <p role="alert" className="text-sm text-destructive">
          {purchase.error.message}
        </p>
      )}
      {shop.isPending ? (
        <p role="status">Loading shop…</p>
      ) : shop.isError ? (
        <div role="alert" className="space-y-2">
          <p>{shop.error.message}</p>
          <Button variant="outline" onClick={() => void shop.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div>
              <p className="text-sm text-muted-foreground">Your beskar</p>
              <p className="flex items-center gap-2 text-2xl font-semibold tabular-nums">
                <CurrencyIcon currency="beskar" className="size-7" />
                {formatBeskar(shop.data.wallet.beskarCents)} beskar
              </p>
            </div>
            {owner && (
              <Button asChild variant="outline">
                <Link
                  to="/users/$userId"
                  params={{ userId: owner.id }}
                  search={previous => ({
                    ...previous,
                    userTab: 'currencies',
                    currencyPage: 'transactions',
                  })}
                >
                  View transactions
                </Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Credits are your Battlefield model budget. Beskar buys extra slots.
          </p>
          {notice && <p role="status">{notice}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {shop.data.items.map(product => {
              const limit =
                product.id === 'achievement-slot'
                  ? shop.data.wallet.achievementLimit
                  : shop.data.wallet.battlefieldLimit;
              const atLimit = limit >= product.maxSlots;
              const affordable = shop.data.wallet.beskarCents >= product.priceCents;
              const retry = requests[product.id]?.uncertain;
              return (
                <Card key={product.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    <p className="flex items-center gap-1.5 text-xl font-semibold">
                      <CurrencyIcon currency="beskar" className="size-6" />
                      {formatBeskar(product.priceCents)} beskar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current slots: {limit.toLocaleString()}
                    </p>
                    {atLimit ? (
                      <p className="text-sm text-muted-foreground">Slot limit reached.</p>
                    ) : (
                      !affordable && (
                        <p className="text-sm text-muted-foreground">
                          You need {formatBeskar(product.priceCents - shop.data.wallet.beskarCents)}{' '}
                          more beskar.
                        </p>
                      )
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      disabled={
                        purchase.isPending ||
                        shop.isFetching ||
                        (!retry && (atLimit || !affordable))
                      }
                      aria-label={`${retry ? 'Retry purchase of' : 'Buy'} ${product.name.toLowerCase()}`}
                      onClick={() => {
                        purchase.reset();
                        setNotice('');
                        setSelected(product.id);
                      }}
                    >
                      {retry ? 'Retry purchase' : 'Buy slot'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {item && (
        <Dialog
          open={active}
          onOpenChange={open => {
            if (!open && !purchase.isPending) setSelected(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buy {item.name.toLowerCase()}</DialogTitle>
              <DialogDescription>
                Spend {formatBeskar(item.priceCents)} beskar to add one {item.name.toLowerCase()} to
                your account.
              </DialogDescription>
            </DialogHeader>
            {purchase.error && (
              <p role="alert" className="text-sm text-destructive">
                {purchase.error.message}
              </p>
            )}
            {requests[item.id]?.uncertain && (
              <p role="status" className="text-sm text-muted-foreground">
                The result could not be confirmed. Retry this purchase to confirm it without paying
                twice.
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={purchase.isPending}
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button disabled={purchase.isPending} onClick={() => void buy()}>
                {purchase.isPending
                  ? 'Buying…'
                  : requests[item.id]?.uncertain
                    ? 'Retry purchase'
                    : `Buy for ${formatBeskar(item.priceCents)} beskar`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
