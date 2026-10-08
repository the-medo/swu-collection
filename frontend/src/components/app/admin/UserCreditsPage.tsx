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
import {
  creditGrantAmount,
  type CreditGrantInput,
  type CreditUser,
} from '../../../../../shared/types/credits';
import type { ErrorWithStatus } from '../../../../../types/ErrorWithStatus';

type PendingGrant = CreditGrantInput & { uncertain: boolean };

export function UserCreditsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CreditUser | null>(null);
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
        <h2 className="text-xl font-semibold">User credits</h2>
        <p className="text-sm text-muted-foreground">
          Everyone starts with 10,000 credits. Give users additional credits for their Battlefield
          budget.
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
                <span className="text-sm tabular-nums">
                  {user.balance === null
                    ? 'Balance requires review'
                    : `${user.balance.toLocaleString()} credits`}
                </span>
                <Button
                  size="sm"
                  disabled={users.isFetching || search.trim() !== query || user.balance === null}
                  aria-label={`Give credits to ${user.displayName}`}
                  onClick={() => {
                    setNotice('');
                    setSelected(user);
                  }}
                >
                  Give credits
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
          key={selected.id}
          user={users.data?.users.find(user => user.id === selected.id) ?? selected}
          request={requests[selected.id] ?? null}
          onRequest={request => rememberRequest(selected.id, request)}
          onClose={() => setSelected(null)}
          onGranted={(amount, balance) => {
            rememberRequest(selected.id, null);
            setNotice(
              `Added ${amount.toLocaleString()} credits to ${selected.displayName}. Current balance: ${balance.toLocaleString()} credits.`,
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
  request,
  onRequest,
  onClose,
  onGranted,
}: {
  user: CreditUser;
  request: PendingGrant | null;
  onRequest: (request: PendingGrant | null) => void;
  onClose: () => void;
  onGranted: (amount: number, balance: number) => void;
}) {
  const mutation = useGrantCredits();
  const form = useForm({
    defaultValues: { amount: request?.amount ?? 0 },
    onSubmit: async ({ value }) => {
      if (request?.uncertain && request.amount !== value.amount) return;
      const attempt =
        request?.amount === value.amount
          ? request
          : { amount: value.amount, requestId: crypto.randomUUID(), uncertain: false };
      onRequest(attempt);
      await mutation
        .mutateAsync({
          userId: user.id,
          input: { amount: attempt.amount, requestId: attempt.requestId },
        })
        .then(result => onGranted(result.amount, result.balance))
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
          <DialogTitle>Give credits to {user.displayName}</DialogTitle>
          <DialogDescription>
            {user.email} · Current balance:{' '}
            {user.balance === null ? 'requires review' : `${user.balance.toLocaleString()} credits`}
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
          <form.Field name="amount" validators={{ onChange: creditGrantAmount }}>
            {field => (
              <div className="space-y-1">
                <Label htmlFor="credit-grant-amount">Credits to add</Label>
                <Input
                  id="credit-grant-amount"
                  type="number"
                  min={1}
                  max={Number.MAX_SAFE_INTEGER}
                  step={1}
                  placeholder="10000"
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
                    user.balance === null ||
                    !creditGrantAmount.safeParse(amount).success
                  }
                >
                  {mutation.isPending
                    ? 'Giving credits…'
                    : request?.uncertain
                      ? 'Retry grant'
                      : 'Give credits'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
