import { useId, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowUpRight,
  ExternalLink,
  Heart,
  LoaderCircle,
  Repeat2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SignInWrapper from '@/components/app/auth/SignInWrapper';
import { useUser } from '@/hooks/useUser';
import { useSupportOverview } from '@/api/support/useSupportOverview';
import {
  useSupportCheckout,
  useCancelSupportCheckout,
  useSupportPortal,
} from '@/api/support/useSupportCheckout';
import { useSupportReceipt } from '@/api/support/useSupportReceipt';
import { SupportArtwork } from './SupportArtwork';
import type { SupportCheckoutInput, SupportCurrency } from '../../../../../shared/types/support';
import { PATREON_LINK } from '../../../../../shared/consts/constants';

const MONTHLY_OPTIONS = [
  {
    amount: 5,
    title: 'Keep it going',
    description: 'A regular contribution toward hosting and upkeep.',
  },
  {
    amount: 10,
    title: 'Help it grow',
    description: 'Give the project a little more room to grow.',
  },
] as const satisfies readonly {
  amount: Extract<SupportCheckoutInput, { kind: 'monthly' }>['amount'];
  title: string;
  description: string;
}[];

const money = (cents: number, currency: SupportCurrency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
export function SupportPage({
  supportCheckout,
  supportRequest,
}: {
  supportCheckout?: 'success' | 'cancelled';
  supportRequest?: string;
}) {
  const user = useUser();
  const optionsHeadingId = useId();
  const [currency, setCurrency] = useState<SupportCurrency>('EUR');
  const [resumingCheckout, setResumingCheckout] = useState(false);
  const overview = useSupportOverview();
  const checkout = useSupportCheckout();
  const cancel = useCancelSupportCheckout();
  const portal = useSupportPortal();
  const receipt = useSupportReceipt(supportCheckout === 'success' ? supportRequest : undefined);
  const requests = useRef(new Map<string, string>());
  const data = overview.data;
  const busy = checkout.isPending || cancel.isPending || portal.isPending;
  const error = checkout.error ?? cancel.error ?? portal.error;
  const disabled = busy || !data?.enabled || data.reviewRequired;
  const start = (kind: 'monthly' | 'one_time', amount?: 5 | 10 | 20) => {
    setResumingCheckout(false);
    const option = `${kind}:${currency}:${amount ?? 'custom'}`;
    let requestId = requests.current.get(option);
    if (!requestId) {
      requestId = crypto.randomUUID();
      requests.current.set(option, requestId);
    }
    const input: SupportCheckoutInput =
      kind === 'monthly'
        ? { kind, currency, amount: amount!, requestId }
        : { kind, currency, requestId };
    checkout.mutate(input, { onSuccess: result => window.location.assign(result.url) });
  };
  const monthly = data?.subscription;
  return (
    <main className="support-accent @container mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <Helmet>
        <title>Support SWUBASE</title>
      </Helmet>
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid @3xl:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-center gap-5 px-7 py-9 sm:px-10 sm:py-12">
            <h1 className="m-0! border-0! p-0! text-4xl! leading-[1.08]! font-semibold! tracking-tight sm:text-5xl!">
              Thank you for being part of SWUBASE
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              SWUBASE is a passion project for the Star Wars: Unlimited community. Whether you use
              it, share feedback, or contribute, thank you for being here.
            </p>
          </div>
          <SupportArtwork className="min-h-56 @3xl:min-h-80" />
        </div>
      </section>
      {overview.isPending && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading support options…
        </p>
      )}
      {overview.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {overview.error.message}{' '}
            <Button variant="link" onClick={() => void overview.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {data && !data.enabled && (
        <Alert>
          <AlertDescription>
            Stripe payments are being set up. You can support SWUBASE through Patreon below.
          </AlertDescription>
        </Alert>
      )}
      {data?.sandbox && (
        <Alert>
          <AlertDescription>
            Sandbox: these payments are for testing and do not charge real money.
          </AlertDescription>
        </Alert>
      )}
      {data?.reviewRequired && (
        <Alert>
          <AlertDescription>
            Your support account needs review. Please contact SWUBASE through Discord. You can still
            manage your subscription below.
          </AlertDescription>
        </Alert>
      )}
      {supportCheckout === 'success' && (
        <section
          aria-label="Payment confirmation"
          aria-live="polite"
          className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-5"
        >
          {!user ? (
            <SignInWrapper text="Sign in to check your payment">
              <span />
            </SignInWrapper>
          ) : !supportRequest ? (
            <p>
              We couldn’t find your checkout receipt. Please contact SWUBASE through Discord if you
              need help confirming your payment.
            </p>
          ) : receipt.error ? (
            <p>
              {receipt.error.message}{' '}
              <Button variant="link" onClick={() => void receipt.refetch()}>
                Check again
              </Button>
            </p>
          ) : receipt.data?.status === 'paid' ? (
            <>
              <h2 className="m-0! border-0! p-0! text-lg! font-semibold!">
                Thank you for supporting SWUBASE!
              </h2>
              <p>Your payment is confirmed. Thank you for helping keep the site running.</p>
            </>
          ) : receipt.data?.status === 'review' ? (
            <p>
              Your payment was received and needs review. Please contact SWUBASE through Discord.
            </p>
          ) : receipt.data?.status === 'expired' ? (
            <p>This checkout expired. You can start a new contribution below.</p>
          ) : (
            <p role="status">
              Waiting for Stripe to confirm your payment.{' '}
              <Button variant="link" onClick={() => void receipt.refetch()}>
                Check again
              </Button>
            </p>
          )}
        </section>
      )}
      {supportCheckout === 'cancelled' && (
        <Alert>
          <AlertDescription>
            You left checkout. You can resume an unfinished monthly contribution below, or choose
            another option.
          </AlertDescription>
        </Alert>
      )}
      {monthly && (
        <section
          aria-label="Your subscription"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-2">
            <h2 className="m-0! border-0! p-0! text-lg! font-semibold!">Your monthly support</h2>
            <p>
              {money(monthly.amountCents, monthly.currency)} per month ·{' '}
              {monthly.status.replaceAll('_', ' ')}
            </p>
            {monthly.cancelAtPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Ends{' '}
                {monthly.periodEnd
                  ? new Date(monthly.periodEnd).toLocaleDateString()
                  : 'at the end of your billing period'}
                . Future renewals are cancelled.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Update your payment method, view invoices or cancel future renewals through Stripe.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 rounded-xl"
            disabled={busy}
            onClick={() =>
              portal.mutate(undefined, { onSuccess: result => window.location.assign(result.url) })
            }
          >
            Manage subscription <ExternalLink className="size-4" />
          </Button>
        </section>
      )}
      {data?.pendingCheckout && (
        <section
          aria-label="Unfinished checkout"
          className="space-y-3 rounded-2xl border border-border bg-card p-5"
        >
          <p>
            You have an unfinished monthly checkout. Resume it or cancel it before choosing another
            monthly amount.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={disabled}
              onClick={() => {
                setResumingCheckout(true);
                checkout.mutate(data.pendingCheckout!, {
                  onSuccess: result => window.location.assign(result.url),
                });
              }}
            >
              {checkout.isPending && resumingCheckout ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Resume checkout
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => cancel.mutate(data.pendingCheckout!.requestId)}
            >
              Cancel checkout
            </Button>
          </div>
        </section>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {checkout.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Opening Stripe checkout…
        </p>
      )}
      <section aria-labelledby={optionsHeadingId} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 id={optionsHeadingId} className="m-0! border-0! p-0! text-xl! font-semibold!">
              A little goes a long way
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose the kind of support that suits you.
            </p>
          </div>
          <div
            role="group"
            aria-label="Payment currency"
            className="flex w-fit shrink-0 gap-1 rounded-xl border border-border bg-muted/40 p-1"
          >
            {(['EUR', 'USD'] as const).map(value => (
              <Button
                key={value}
                size="sm"
                className="rounded-lg px-4"
                variant={currency === value ? 'default' : 'ghost'}
                aria-pressed={currency === value}
                disabled={busy}
                onClick={() => setCurrency(value)}
              >
                {value === 'EUR' ? '€ EUR' : '$ USD'}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
          <section
            aria-labelledby={`${optionsHeadingId}-monthly`}
            className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card @xl:col-span-2"
          >
            <h3
              id={`${optionsHeadingId}-monthly`}
              className="m-0! flex items-center gap-2 border-0! px-5! pt-5! pb-0! text-base! font-semibold!"
            >
              <Repeat2 className="size-4 text-muted-foreground" aria-hidden="true" />
              Support monthly
            </h3>
            <div className="grid flex-1 divide-y divide-border @xl:grid-cols-2 @xl:divide-x @xl:divide-y-0">
              {MONTHLY_OPTIONS.map(({ amount, title, description }) => (
                <article key={amount} className="flex min-w-0 flex-col gap-4 p-5">
                  <div className="space-y-1">
                    <h4 className="m-0! text-sm! font-medium! text-muted-foreground">{title}</h4>
                    <p className="text-4xl leading-tight! font-semibold tracking-tight tabular-nums">
                      {money(amount * 100, currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                  <div className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:whitespace-normal">
                    <SignInWrapper text="Sign in to support">
                      <Button
                        aria-label={`Support monthly, ${money(amount * 100, currency)}`}
                        disabled={disabled || Boolean(monthly || data?.pendingCheckout)}
                        onClick={() => start('monthly', amount)}
                      >
                        {checkout.isPending &&
                        !resumingCheckout &&
                        checkout.variables?.kind === 'monthly' &&
                        checkout.variables.currency === currency &&
                        checkout.variables.amount === amount ? (
                          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        Support monthly
                      </Button>
                    </SignInWrapper>
                  </div>
                </article>
              ))}
            </div>
            <p className="border-t border-border bg-muted/30 px-5 py-3 text-xs leading-5! text-muted-foreground">
              Renews monthly. Cancel future renewals anytime.
            </p>
          </section>
          <section
            aria-labelledby={`${optionsHeadingId}-one-time`}
            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <h3
              id={`${optionsHeadingId}-one-time`}
              className="m-0! flex items-center gap-2 border-0! p-0! text-base! font-semibold!"
            >
              <Heart
                className="size-4 fill-current text-primary"
                strokeWidth={2.5}
                aria-hidden="true"
              />
              Give once
            </h3>
            <div className="space-y-2 pt-2">
              <p className="text-3xl leading-tight! font-semibold tracking-tight">Any amount</p>
              <p className="text-sm text-muted-foreground">One contribution, your choice.</p>
            </div>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
              Choose your own amount in {currency} at checkout. A little or a lot, it all helps.
            </p>
            <div className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:whitespace-normal">
              <SignInWrapper text="Sign in to give once">
                <Button variant="outline" disabled={disabled} onClick={() => start('one_time')}>
                  {checkout.isPending && checkout.variables?.kind === 'one_time' ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Choose an amount
                </Button>
              </SignInWrapper>
            </div>
            <p className="text-xs text-muted-foreground">A single payment. No renewal.</p>
          </section>
          <section
            aria-labelledby={`${optionsHeadingId}-patreon`}
            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[#FF424D]/25 bg-[#FF424D]/5 p-5"
          >
            <h3
              id={`${optionsHeadingId}-patreon`}
              className="m-0! flex items-center gap-2 border-0! p-0! text-base! font-semibold!"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 436 476"
                className="size-4 text-[#FF424D]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M436 143c-.084-60.778-47.57-110.591-103.285-128.565C263.528-7.884 172.279-4.649 106.214 26.424 26.142 64.089.988 146.596.051 228.883c-.77 67.653 6.004 245.841 106.83 247.11 74.917.948 86.072-95.279 120.737-141.623 24.662-32.972 56.417-42.285 95.507-51.929C390.309 265.865 436.097 213.011 436 143Z" />
              </svg>
              Patreon
            </h3>
            <div className="space-y-2 pt-2">
              <p className="text-3xl leading-tight! font-semibold tracking-tight">
                Prefer Patreon?
              </p>
              <p className="text-sm text-muted-foreground">We’re there, too.</p>
            </div>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
              Support SWUBASE through a platform you already know, with everything managed in your
              Patreon account.
            </p>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full rounded-xl border-[#FF424D]/30 bg-transparent whitespace-normal hover:bg-[#FF424D]/10"
            >
              <a href={PATREON_LINK} target="_blank" rel="noopener noreferrer">
                Support on Patreon <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">Opens Patreon in a new tab.</p>
          </section>
        </div>
      </section>
      <p className="flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Stripe handles payment details securely. Thank you for supporting SWUBASE.
      </p>
    </main>
  );
}
