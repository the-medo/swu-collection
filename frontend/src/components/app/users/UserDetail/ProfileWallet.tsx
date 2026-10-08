import { Link } from '@tanstack/react-router';
import { useUserWallet } from '@/api/wallet/useUserWallet';
import { Button } from '@/components/ui/button';
import { CurrencyIcon } from '@/components/app/global/CurrencyIcon';
import { formatBeskar } from '../../../../../../shared/types/credits';

export function ProfileWallet({ userId }: { userId: string }) {
  const wallet = useUserWallet(userId);
  return (
    <section aria-label="Your balances" className="space-y-3 rounded-md border p-3">
      {wallet.isPending ? (
        <p role="status" className="text-sm">
          Loading balances…
        </p>
      ) : wallet.isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>{wallet.error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void wallet.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <dl className="space-y-2 text-sm tabular-nums">
          <div className="flex flex-wrap justify-between gap-x-2">
            <dt className="flex items-center gap-1.5">
              <CurrencyIcon currency="credits" />
              Credits
            </dt>
            <dd>{wallet.data.credits.toLocaleString()}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-2">
            <dt className="flex items-center gap-1.5">
              <CurrencyIcon currency="beskar" />
              Beskar
            </dt>
            <dd>{formatBeskar(wallet.data.beskarCents)}</dd>
          </div>
        </dl>
      )}
      <Link
        to="/users/$userId"
        params={{ userId }}
        search={previous => ({ ...previous, userTab: 'currencies', currencyPage: undefined })}
        hash="user-currencies"
        resetScroll={false}
        className="inline-flex text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        More info
      </Link>
    </section>
  );
}
