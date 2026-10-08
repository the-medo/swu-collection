import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useCreditUsers } from '@/api/credits/useCreditUsers';
import { useGrantCredits } from '@/api/credits/useGrantCredits';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import FormFieldError from '@/components/app/global/FormFieldError';
import { CurrencyIcon } from '@/components/app/global/CurrencyIcon';
import {
  creditGrantAmount,
  beskarGrantAmount,
  formatBeskar,
  type CreditCurrency,
  type CreditGrantResult,
  type CreditUser,
} from '../../../../../shared/types/credits';
import type { ErrorWithStatus } from '../../../../../types/ErrorWithStatus';

type PendingGrant = {
  currency: CreditCurrency;
  amount: number;
  requestId: string;
  uncertain: boolean;
};

export function UserCreditsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ user: CreditUser; currency: CreditCurrency } | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  const [requests, setRequests] = useState<Record<string, PendingGrant>>({});
  const rememberRequest = (userId: string, request: PendingGrant | null) => {
    setRequests(previous => {
      const next = { ...previous };
      if (request) next[userId] = request;
      else delete next[userId];
      return next;
    });
  };
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const users = useCreditUsers(query);
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">User currencies</h2>
        <p className="text-sm text-muted-foreground">
          Everyone starts with 10,000 credits. Award credits for Battlefield models or beskar for
          shop purchases.
        </p>
      </div>
      <Input
        aria-label="Search users"
        placeholder="Search by name, display name or email…"
        maxLength={120}
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      {notice && <p role="status">{notice}</p>}
      {users.isPending ? (
        <p role="status">Loading users…</p>
      ) : users.isError ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {users.error.message}
          <Button variant="outline" size="sm" onClick={() => void users.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {users.data.users.map(user => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="font-medium break-words">{user.displayName}</div>
                  <div className="text-sm text-muted-foreground break-words">{user.name}</div>
                  <div className="text-sm text-muted-foreground break-all">{user.email}</div>
                </div>
                <span className="flex items-center gap-1.5 text-sm tabular-nums">
                  <CurrencyIcon currency="credits" />
                  {user.balance === null
                    ? 'Balance requires review'
                    : `${user.balance.toLocaleString()} credits`}
                </span>
                <span className="flex items-center gap-1.5 text-sm tabular-nums">
                  <CurrencyIcon currency="beskar" />
                  {formatBeskar(user.beskarCents)} beskar
                </span>
                <Button
                  size="sm"
                  disabled={users.isFetching || search.trim() !== query || user.balance === null}
                  aria-label={`Give credits to ${user.displayName}`}
                  onClick={() => {
                    setNotice('');
                    setSelected({ user, currency: 'credits' });
                  }}
                >
                  Give credits
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={users.isFetching || search.trim() !== query}
                  aria-label={`Give beskar to ${user.displayName}`}
                  onClick={() => {
                    setNotice('');
                    setSelected({ user, currency: 'beskar' });
                  }}
                >
                  Give beskar
                </Button>
              </li>
            ))}
          </ul>
          {users.data.users.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching users.</p>
          )}
          {users.data.hasMore && (
            <p className="text-sm text-muted-foreground">
              Showing the first 25 users. Narrow your search to find someone else.
            </p>
          )}
        </>
      )}
      {selected && (
        <CreditGrantDialog
          key={`${selected.user.id}:${selected.currency}`}
          user={users.data?.users.find(user => user.id === selected.user.id) ?? selected.user}
          currency={selected.currency}
          request={requests[`${selected.user.id}:${selected.currency}`] ?? null}
          onRequest={request =>
            rememberRequest(`${selected.user.id}:${selected.currency}`, request)
          }
          onClose={() => setSelected(null)}
          onGranted={result => {
            rememberRequest(`${selected.user.id}:${selected.currency}`, null);
            const balance =
              result.currency === 'beskar'
                ? formatBeskar(result.beskarCents)
                : result.balance.toLocaleString();
            setNotice(
              `Added ${result.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${result.currency} to ${selected.user.displayName}. Current balance: ${balance} ${result.currency}.`,
            );
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}

function CreditGrantDialog({
  user,
  currency,
  request,
  onRequest,
  onClose,
  onGranted,
}: {
  user: CreditUser;
  currency: CreditCurrency;
  request: PendingGrant | null;
  onRequest: (request: PendingGrant | null) => void;
  onClose: () => void;
  onGranted: (result: CreditGrantResult) => void;
}) {
  const mutation = useGrantCredits();
  const amountSchema = currency === 'beskar' ? beskarGrantAmount : creditGrantAmount;
  const form = useForm({
    defaultValues: { amount: request?.amount ?? 0 },
    onSubmit: async ({ value }) => {
      if (request?.uncertain && request.amount !== value.amount) return;
      const attempt =
        request?.amount === value.amount
          ? request
          : { currency, amount: value.amount, requestId: crypto.randomUUID(), uncertain: false };
      onRequest(attempt);
      await mutation
        .mutateAsync({
          userId: user.id,
          input: { currency, amount: attempt.amount, requestId: attempt.requestId },
        })
        .then(onGranted)
        .catch((error: ErrorWithStatus) => {
          const rejected =
            error.status !== undefined && [400, 401, 403, 404, 409, 413].includes(error.status);
          // A denied retry says nothing about whether an earlier attempt committed.
          onRequest(rejected && !attempt.uncertain ? null : { ...attempt, uncertain: true });
        });
    },
  });
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Give {currency} to {user.displayName}
          </DialogTitle>
          <DialogDescription>
            {user.email} · Current balance:{' '}
            {currency === 'beskar'
              ? `${formatBeskar(user.beskarCents)} beskar`
              : user.balance === null
                ? 'requires review'
                : `${user.balance.toLocaleString()} credits`}
            .
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="amount" validators={{ onChange: amountSchema }}>
            {field => (
              <div className="space-y-1">
                <Label htmlFor="credit-grant-amount">
                  {currency === 'beskar' ? 'Beskar' : 'Credits'} to add
                </Label>
                <Input
                  id="credit-grant-amount"
                  type="number"
                  min={currency === 'beskar' ? 0.01 : 1}
                  max={
                    currency === 'beskar' ? Number.MAX_SAFE_INTEGER / 100 : Number.MAX_SAFE_INTEGER
                  }
                  step={currency === 'beskar' ? 0.01 : 1}
                  placeholder={currency === 'beskar' ? '5' : '10000'}
                  value={field.state.value || ''}
                  disabled={mutation.isPending || request?.uncertain}
                  onBlur={field.handleBlur}
                  onChange={event => field.handleChange(Number(event.target.value))}
                  required
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          {request?.uncertain && (
            <p role="status" className="text-sm text-muted-foreground">
              The result could not be confirmed. Retry this grant to confirm it before entering
              another amount.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={state => [state.values.amount, state.isSubmitting] as const}>
              {([amount, submitting]) => (
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    mutation.isPending ||
                    (currency === 'credits' && user.balance === null) ||
                    !amountSchema.safeParse(amount).success
                  }
                >
                  {mutation.isPending
                    ? `Giving ${currency}…`
                    : request?.uncertain
                      ? 'Retry grant'
                      : `Give ${currency}`}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
