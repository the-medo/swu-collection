import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useMeleeConnection } from '@/api/integration/melee/useMeleeConnection.ts';
import { useMeleeConnectionMutation } from '@/api/integration/melee/useMeleeConnectionMutation.ts';
import { useUser } from '@/hooks/useUser.ts';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';
import {
  meleeProfileUrl,
  meleeUsernameSchema,
  type MeleeConnectionStatus,
} from '../../../../../../shared/lib/meleeConnection.ts';

export default function IntegrationsSettings() {
  const user = useUser();
  const query = useMeleeConnection();
  if (!user) return null;
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">Connect your accounts to SWUBASE.</p>
      {query.isPending ? (
        <p role="status">Loading integrations…</p>
      ) : query.isError ? (
        <div role="alert" className="space-y-2">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <MeleeIntegration key={user.id} status={query.data} />
      )}
    </section>
  );
}

function MeleeIntegration({ status }: { status: MeleeConnectionStatus }) {
  const mutation = useMeleeConnectionMutation();
  const { connection, challenge } = status;
  const [now, setNow] = useState(() => Date.now());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyErrorCode, setCopyErrorCode] = useState<string | null>(null);
  const copied = copiedCode === challenge?.code;
  const copyError = copyErrorCode === challenge?.code;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const expired = !!challenge && new Date(challenge.expiresAt).getTime() <= now;
  const form = useForm({
    defaultValues: { username: '' },
    onSubmit: async ({ value }) => {
      await mutation
        .mutateAsync({ action: 'start', username: value.username })
        .catch(() => undefined);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Melee.gg</h4>
        {connection && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="size-4" />
            Connected
          </span>
        )}
      </div>
      {connection ? (
        <>
          <div className="space-y-1">
            <a
              href={meleeProfileUrl(connection.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 text-primary underline underline-offset-4"
            >
              <span className="break-all">
                {connection.displayName} (@{connection.username})
              </span>
              <ExternalLink className="size-4 shrink-0" />
            </a>
            <p className="text-sm text-muted-foreground">
              Connected {new Date(connection.linkedAt).toLocaleDateString()}. You can remove the
              verification code from your Melee bio.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={mutation.isPending}>
                Disconnect Melee
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect your Melee account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the link to {connection.username}. You can reconnect by verifying a
                  new code in your bio.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep connected</AlertDialogCancel>
                <AlertDialogAction onClick={() => mutation.mutate({ action: 'disconnect' })}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : challenge ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Copy the verification code below.</li>
            <li>
              Open{' '}
              <a
                href="https://melee.gg/Profile/Account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Melee account settings
              </a>
              , paste the code on its own line in your bio, and save.
            </li>
            <li>
              Check that it appears on{' '}
              <a
                href={meleeProfileUrl(challenge.username)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                your public profile (@{challenge.username})
              </a>
              , then select Verify and connect.
            </li>
          </ol>
          <div className="space-y-2">
            <Label htmlFor="melee-verification-code">Verification code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="melee-verification-code"
                className="min-w-0 font-mono text-xs"
                value={challenge.code}
                readOnly
                onFocus={event => event.target.select()}
              />
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(challenge.code);
                    setCopiedCode(challenge.code);
                    setCopyErrorCode(null);
                  } catch {
                    setCopyErrorCode(challenge.code);
                  }
                }}
              >
                <Copy className="mr-2 size-4" />
                {copied ? 'Copied' : 'Copy code'}
              </Button>
            </div>
            {copyError && (
              <p role="alert" className="text-sm">
                Could not copy automatically. Select the code and copy it manually.
              </p>
            )}
            <p role="status" className="text-sm text-muted-foreground">
              {expired
                ? 'This code expired. Generate a new code to continue.'
                : `Expires at ${new Date(challenge.expiresAt).toLocaleTimeString()}. You can remove it after connecting.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending || expired}
              onClick={() => mutation.mutate({ action: 'verify' })}
            >
              {mutation.isPending && mutation.variables?.action === 'verify'
                ? 'Checking bio…'
                : 'Verify and connect'}
            </Button>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ action: 'start', username: challenge.username })}
            >
              Generate new code
            </Button>
            <Button
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ action: 'disconnect' })}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Verify ownership by temporarily adding a code to your public Melee bio. SWUBASE will
            save your Melee username and display name.
          </p>
          <form
            className="space-y-3"
            onSubmit={event => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) =>
                  meleeUsernameSchema.safeParse(value).error?.issues[0]?.message,
              }}
            >
              {field => (
                <div className="space-y-2">
                  <Label htmlFor="melee-username">Melee username</Label>
                  <Input
                    id="melee-username"
                    placeholder="Your Melee username"
                    autoComplete="off"
                    maxLength={100}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={event => field.handleChange(event.target.value)}
                    aria-describedby="melee-username-help"
                    disabled={mutation.isPending}
                  />
                  <p id="melee-username-help" className="text-sm text-muted-foreground">
                    Use the last part of your public profile URL: melee.gg/Profile/Index/username
                  </p>
                  <FormFieldError meta={field.state.meta} />
                </div>
              )}
            </form.Field>
            <form.Subscribe selector={state => [state.canSubmit, state.values.username]}>
              {([canSubmit, username]) => (
                <Button type="submit" disabled={!canSubmit || !username || mutation.isPending}>
                  {mutation.isPending ? 'Generating code…' : 'Connect Melee'}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
