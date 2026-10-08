import { useState } from 'react';
import { usePatreonOverview } from '@/api/patreon/usePatreonOverview';
import { useSyncPatreon } from '@/api/patreon/useSyncPatreon';
import { useReviewPatreonMember } from '@/api/patreon/useReviewPatreonMember';
import { formatBeskar } from '../../../../../shared/types/credits';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const money = (cents: number | null) =>
  cents === null
    ? 'Unavailable'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
const date = (value: string | null) => (value ? new Date(value).toLocaleString() : 'Never');
const reviewLabels: Record<string, string> = {
  lifetime_decreased: 'Support total decreased — review required',
  payment_review: 'Refund or fraud status — review required',
  invalid_member: 'Patreon returned an invalid member record',
  account_removed: 'Previously credited account was deleted',
  missing_amount: 'Patreon support amount unavailable',
  email_unavailable: 'Patreon email unavailable',
  ambiguous_email: 'More than one account matches this email',
  email_changed: 'Linked account email changed or is unverified',
};

export function PatreonPage() {
  const [page, setPage] = useState(1);
  const overview = usePatreonOverview(page);
  const sync = useSyncPatreon();
  const review = useReviewPatreonMember();
  const data = overview.data;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Patreon supporters</h2>
          <p className="text-sm text-muted-foreground">
            1 USD of support earns 1,000 credits and 1 beskar. Accounts match by verified email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={overview.isFetching}
            onClick={() => void overview.refetch()}
          >
            Refresh view
          </Button>
          <Button disabled={!data?.configured || sync.isPending} onClick={() => sync.mutate()}>
            {sync.isPending ? 'Synchronizing…' : 'Sync supporters and award currencies'}
          </Button>
        </div>
      </div>
      {sync.isSuccess && (
        <p role="status" className="text-sm">
          Checked {sync.data.members} supporters and awarded {sync.data.credits.toLocaleString()}{' '}
          credits and {formatBeskar(sync.data.credits / 10)} beskar across {sync.data.awards}{' '}
          {sync.data.awards === 1 ? 'award' : 'awards'}.
        </p>
      )}
      {sync.isError && (
        <p role="alert" className="text-sm text-destructive">
          {sync.error.message}
        </p>
      )}
      {review.isSuccess && (
        <p role="status" className="text-sm">
          Review completed. {review.data.credits.toLocaleString()} credits and{' '}
          {formatBeskar(review.data.credits / 10)} beskar awarded; previous awards preserved.
        </p>
      )}
      {review.isError && (
        <p role="alert" className="text-sm text-destructive">
          {review.error.message}
        </p>
      )}
      {overview.isPending ? (
        <p role="status">Loading supporters…</p>
      ) : overview.isError ? (
        <p role="alert" className="text-destructive">
          {overview.error.message}
        </p>
      ) : (
        data && (
          <>
            {!data.configured && (
              <p className="rounded-md border p-3 text-sm">
                Patreon creator credentials and a token encryption key must be configured before
                syncing.
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>{data.total} supporters</span>
              <span>Last full sync: {date(data.lastSyncAt)}</span>
              <span>Last webhook: {date(data.lastWebhookAt)}</span>
              <Badge variant={data.webhookConfigured ? 'secondary' : 'outline'}>
                {data.webhookConfigured ? 'Webhook secret configured' : 'Webhook setup needed'}
              </Badge>
            </div>
            {data.lastSyncSkipped > 0 && (
              <p role="alert" className="text-sm text-destructive">
                The last sync skipped {data.lastSyncSkipped} invalid Patreon records. Valid
                supporters were processed. Re-sync after correcting the provider data.
              </p>
            )}
            {!data.webhookConfigured && (
              <p className="text-sm text-muted-foreground">
                Configure the Patreon webhook and its signing secret to receive payment updates
                automatically. No periodic synchronization is scheduled.
              </p>
            )}
            {data.members.length === 0 ? (
              <p className="rounded-md border p-6 text-sm text-muted-foreground">
                No supporters on this page. Run a sync to import current and former supporters and
                award their past support.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supporter</TableHead>
                      <TableHead>SWUBASE account</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Lifetime support</TableHead>
                      <TableHead>Currencies awarded</TableHead>
                      <TableHead>Credit balance</TableHead>
                      <TableHead>Last charge attempt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.members.map(member => (
                      <TableRow key={member.memberId}>
                        <TableCell className="min-w-44">
                          <div className="font-medium">{member.name || 'Unnamed supporter'}</div>
                          <div className="break-all text-xs text-muted-foreground">
                            {member.email || 'Email not shared'}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-48">
                          <div>{member.displayName || 'Awaiting matching account'}</div>
                          {member.reviewReason && (
                            <div className="text-xs text-destructive">
                              {reviewLabels[member.reviewReason] || 'Review required'}
                            </div>
                          )}
                          {['payment_review', 'lifetime_decreased', 'invalid_member'].includes(
                            member.reviewReason ?? '',
                          ) && (
                            <Button
                              className="mt-2"
                              size="sm"
                              variant="outline"
                              disabled={review.isPending || sync.isPending}
                              title={
                                member.reviewReason === 'invalid_member'
                                  ? 'Fetch a valid member record and retry email matching and credit checks.'
                                  : 'Fetch current support and approve credits above the total already awarded, when payment and email checks pass.'
                              }
                              onClick={() => review.mutate(member.memberId)}
                            >
                              {member.reviewReason === 'invalid_member'
                                ? 'Recheck record'
                                : 'Recheck and approve'}
                            </Button>
                          )}
                          {member.reviewedAt && (
                            <div className="text-xs text-muted-foreground">
                              Reviewed {date(member.reviewedAt)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.patronStatus?.replace(/_/g, ' ') || 'Free / unspecified'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {money(member.lifetimeCents)}
                        </TableCell>
                        <TableCell>
                          <div>{(member.creditedCents * 10).toLocaleString()} credits</div>
                          <div className="text-xs text-muted-foreground">
                            {formatBeskar(member.creditedCents)} beskar
                          </div>
                        </TableCell>
                        <TableCell>{member.balance?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="min-w-40">
                          <div>{date(member.lastChargeAt)}</div>
                          <div className="text-xs text-muted-foreground">
                            {member.lastChargeStatus || 'No charge status'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                disabled={page === 1 || overview.isFetching}
                onClick={() => setPage(value => value - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
              </span>
              <Button
                variant="outline"
                disabled={page * data.pageSize >= data.total || overview.isFetching}
                onClick={() => setPage(value => value + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )
      )}
    </section>
  );
}
