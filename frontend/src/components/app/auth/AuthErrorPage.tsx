import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Ban, Clock3, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAccountRestriction } from '@/api/auth/useAccountRestriction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignIn from './SignIn';

export default function AuthErrorPage({ error }: { error?: string }) {
  const isRestricted = error === 'banned' || error === 'BANNED_USER';
  const restriction = useAccountRestriction(isRestricted);
  const notice = isRestricted ? restriction.data?.notice : undefined;
  const suspended = notice?.status === 'suspended';
  const banned = notice?.status === 'banned';
  const available = notice?.status === 'available';
  const stale = (suspended || banned) && !restriction.data?.current;
  const loading = isRestricted && restriction.isPending;
  const title = loading
    ? 'Checking your account'
    : stale
      ? `Last known status: ${suspended ? 'suspended' : 'banned'}`
      : suspended
        ? 'Your account is suspended'
        : banned
          ? 'Your account is banned'
          : available
            ? 'You can sign in again'
            : isRestricted
              ? 'Your account is restricted'
              : 'Unable to sign in';
  const Icon = suspended ? Clock3 : banned ? Ban : available ? ShieldCheck : TriangleAlert;

  return (
    <div className="flex flex-1 items-start justify-center p-4 py-10 sm:py-20">
      <Helmet title={`${title} | SWUBASE`}>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Card className="w-full max-w-lg">
        <CardHeader className="gap-3">
          <Icon className="size-9 text-muted-foreground" aria-hidden="true" />
          <CardTitle role="heading" aria-level={1} aria-live="polite">
            {title}
          </CardTitle>
          <CardDescription>
            {loading
              ? 'Please wait while we check your access.'
              : stale
                ? 'This status check has expired. Sign in again to check your current access. The details below are from your last verified check.'
                : suspended
                  ? 'You cannot sign in or use account features during this suspension.'
                  : banned
                    ? 'Your access to account features has been removed. This ban has no automatic end date.'
                    : available
                      ? 'Your account is no longer restricted. Sign in to continue.'
                      : isRestricted
                        ? 'Sign-in was blocked by an account restriction. Sign in again to check its current status and any end date.'
                        : error === 'access_denied'
                          ? 'Sign-in was cancelled or permission was declined. You can try again when you are ready.'
                          : 'We could not complete your sign-in. Please try again.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {suspended && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-4">
              <p className="text-sm font-medium">Suspension ends</p>
              <time dateTime={notice.expiresAt} className="block font-semibold">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'full',
                  timeStyle: 'long',
                }).format(new Date(notice.expiresAt))}
              </time>
              <p className="text-sm text-muted-foreground">
                Shown in your local time. Access returns automatically when a suspension ends. You
                will need to sign in again.
              </p>
            </div>
          )}
          {restriction.isError && isRestricted && (
            <p role="alert" className="text-sm text-destructive">
              Could not check your account status. Please try checking again.
            </p>
          )}
          {!loading && (
            <div className="flex flex-wrap gap-2">
              <SignIn forceTextButton buttonText={available ? 'Sign in' : 'Try signing in again'} />
              {isRestricted && (
                <Button
                  variant="outline"
                  disabled={restriction.isFetching}
                  onClick={() => restriction.refetch()}
                >
                  {restriction.isFetching ? 'Checking…' : 'Check again'}
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            You can still browse public pages while signed out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
