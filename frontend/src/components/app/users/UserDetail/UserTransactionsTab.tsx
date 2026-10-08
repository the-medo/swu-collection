import { useState } from 'react';
import { useUserTransactions } from '@/api/wallet/useUserTransactions';
import { Button } from '@/components/ui/button';
import { CurrencyIcon } from '@/components/app/global/CurrencyIcon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatCurrencyAmount,
  SHOP_ITEMS,
  type UserTransaction,
} from '../../../../../../shared/types/credits';

function description(transaction: UserTransaction) {
  if (transaction.itemId)
    return SHOP_ITEMS.find(item => item.id === transaction.itemId)?.name ?? 'Shop purchase';
  return (
    (
      {
        starting: 'Starting credits',
        admin: 'Admin award',
        patreon: 'Patreon support',
        stripe: 'Stripe support',
      } as Record<string, string>
    )[transaction.source] ?? 'Balance adjustment'
  );
}

export function UserTransactionsTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const transactions = useUserTransactions(userId, page);
  if (transactions.isPending)
    return (
      <p role="status" className="p-3">
        Loading transactions…
      </p>
    );
  if (transactions.isError)
    return (
      <div role="alert" className="space-y-2 p-3">
        <p>{transactions.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => void transactions.refetch()}>
          Retry
        </Button>
      </div>
    );
  const data = transactions.data;
  return (
    <section aria-label="Your transactions" className="space-y-3">
      {data.transactions.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.map(transaction => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">
                    <time dateTime={transaction.createdAt}>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </time>
                  </TableCell>
                  <TableCell>{description(transaction)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <CurrencyIcon currency={transaction.currency} />
                      {transaction.amount > 0 ? '+' : ''}
                      {formatCurrencyAmount(transaction.currency, transaction.amount)}{' '}
                      {transaction.currency}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data.total > data.pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || transactions.isFetching}
            onClick={() => setPage(value => value - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * data.pageSize >= data.total || transactions.isFetching}
            onClick={() => setPage(value => value + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
