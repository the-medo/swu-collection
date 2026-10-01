import { useState } from 'react';
import { CalendarPlus, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog.tsx';
import {
  useCalendarSubscription,
  useChangeCalendarSubscription,
  type SubscriptionAction,
} from '@/api/tournaments/useCalendarSubscription.ts';

export function CalendarSubscriptionButton() {
  const user = useUser();
  return user ? <Subscription key={user.id} /> : null;
}

function Subscription() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="size-4" />
          Calendar subscription
        </Button>
      </DialogTrigger>
      {open && <SubscriptionSettings />}
    </Dialog>
  );
}

function SubscriptionSettings() {
  const query = useCalendarSubscription();
  const mutation = useChangeCalendarSubscription();
  const [confirm, setConfirm] = useState<'regenerate' | 'disable' | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const url = query.data?.url;
  const change = (action: SubscriptionAction) =>
    mutation.mutate(action, {
      onSuccess: () => {
        setConfirm(null);
        setCopiedUrl(null);
        setCopyError(false);
      },
    });
  return (
    <DialogContent
      data-amp-mask
      data-amp-mask-attributes="value,aria-label"
      className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
    >
      <DialogHeader>
        <DialogTitle>Calendar subscription</DialogTitle>
        <DialogDescription>
          Follow your SWUBASE tournaments in Google Calendar or another calendar app.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <p className="m-0 leading-snug!">
          Includes all saved, maybe, and going tournaments. Private attachments and notes are never
          included.
        </p>
        {query.isPending && <p role="status">Loading your subscription…</p>}
        {query.error && (
          <p role="alert" className="text-destructive">
            {query.error.message}{' '}
            <Button variant="link" size="sm" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {query.data &&
          (query.data.enabled && url ? (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="calendar-subscription-url">Private calendar URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="calendar-subscription-url"
                  value={url}
                  readOnly
                  autoComplete="off"
                  className="min-w-0 font-mono text-xs"
                  onFocus={event => event.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopiedUrl(url);
                      setCopyError(false);
                    } catch {
                      setCopyError(true);
                    }
                  }}
                >
                  {copiedUrl === url ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedUrl === url ? 'Copied' : 'Copy URL'}
                </Button>
              </div>
              {copyError && (
                <p role="alert" className="text-destructive">
                  Could not copy automatically. Select the URL above and copy it manually.
                </p>
              )}
              <p className="m-0 text-xs leading-snug! text-muted-foreground">
                Anyone with this URL can read these events. Keep it private.
              </p>
            </div>
          ) : (
            <Button disabled={mutation.isPending} onClick={() => change('enable')}>
              <CalendarPlus className="size-4" />
              {mutation.isPending ? 'Creating…' : 'Create subscription URL'}
            </Button>
          ))}
        <div className="space-y-2">
          <h4 className="font-semibold">Add to Google Calendar</h4>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Copy your private calendar URL.</li>
            <li>
              On a computer, open Google Calendar and choose{' '}
              <strong>Other calendars → + → From URL</strong>.
            </li>
            <li>
              Paste the URL and click <strong>Add calendar</strong>.
            </li>
          </ol>
          <Button asChild variant="outline" size="sm">
            <a
              href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Google Calendar
              <ExternalLink className="size-3" />
            </a>
          </Button>
        </div>
        <p className="m-0 text-xs leading-snug! text-muted-foreground">
          Google controls refresh timing, so changes may take time to appear. Updates flow from
          SWUBASE to your calendar; changes in Google do not update SWUBASE. Subscribe by URL to
          receive updates—importing a downloaded file is only a snapshot.
        </p>
        {import.meta.env.DEV && (
          <p className="m-0 text-xs leading-snug! text-muted-foreground">
            This development URL may only be reachable on your network. Google needs a publicly
            reachable SWUBASE URL to subscribe.
          </p>
        )}
        {query.data?.enabled && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => {
                mutation.reset();
                setConfirm('regenerate');
              }}
            >
              <RefreshCw className="size-3" />
              Regenerate URL
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => {
                mutation.reset();
                setConfirm('disable');
              }}
            >
              Disable subscription
            </Button>
          </div>
        )}
        {mutation.error && !confirm && (
          <p role="alert" className="text-destructive">
            {mutation.error.message}
          </p>
        )}
      </div>
      <AlertDialog
        open={!!confirm}
        onOpenChange={open => {
          if (!open && !mutation.isPending) setConfirm(null);
        }}
      >
        <AlertDialogContent data-amp-mask>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'regenerate'
                ? 'Regenerate calendar URL?'
                : 'Disable calendar subscription?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'regenerate'
                ? 'The old URL will stop working immediately. Remove the old calendar subscription and add the new URL in each calendar app.'
                : 'The URL will stop working immediately. Previously downloaded events may remain in calendar apps until you remove the subscription.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => {
                if (confirm) change(confirm);
              }}
            >
              {mutation.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  );
}
