import { useEffect, useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useEmailAuthConfig } from '@/api/auth/useEmailAuthConfig.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { emailAuthError } from '@/components/app/auth/emailAuthErrors.ts';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';

export default function SecuritySettings() {
  const user = useUser();
  const config = useEmailAuthConfig();
  const id = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(false), 60_000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const accounts = useQuery({
    queryKey: ['auth', 'accounts', user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) throw new Error('Could not load sign-in methods.');
      return result.data ?? [];
    },
  });
  const password = accounts.data?.some(account => account.providerId === 'credential');
  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      setMessage(null);
      if (value.newPassword !== value.confirmPassword) {
        setError('The new passwords do not match.');
        return;
      }
      try {
        const result = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions: true,
        });
        if (result.error) setError(emailAuthError(result.error));
        else {
          form.reset();
          setMessage('Password updated. Your other sessions have been signed out.');
        }
      } catch {
        setError(emailAuthError(null));
      }
    },
  });
  async function requestPassword() {
    if (!user || sending || cooldown) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authClient.requestPasswordReset({
        email: user.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (result.error) setError(emailAuthError(result.error));
      else {
        setCooldown(true);
        setMessage(
          'Check your inbox for a link to set your password. Google and GitHub will keep working.',
        );
      }
    } catch {
      setError(emailAuthError(null));
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="amp-block space-y-6" data-auth-private>
      <div className="space-y-2">
        <h3 className="text-base!">Sign-in methods</h3>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {accounts.isPending ? (
          <p>Loading…</p>
        ) : accounts.isError ? (
          <div role="alert">
            Could not load your sign-in methods.{' '}
            <Button variant="link" onClick={() => accounts.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {accounts.data?.map(account => (
              <li key={account.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                {account.providerId === 'credential'
                  ? 'Email and password'
                  : account.providerId === 'google'
                    ? 'Google'
                    : account.providerId === 'github'
                      ? 'GitHub'
                      : account.providerId}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm leading-6! text-muted-foreground">
          Google and GitHub using the same verified email address connect to this account. Your
          decks and collection stay together.
        </p>
      </div>
      {config.data?.enabled && accounts.isSuccess && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg!">{password ? 'Change password' : 'Add a password'}</h3>
          {password ? (
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map(name => (
                <form.Field
                  key={name}
                  name={name}
                  validators={{
                    onSubmit: ({ value }) =>
                      value.length >= (name === 'currentPassword' ? 1 : 12) && value.length <= 128
                        ? undefined
                        : 'Use 12–128 characters.',
                  }}
                >
                  {field => (
                    <div className="space-y-1.5">
                      <Label htmlFor={`${id}-${name}`}>
                        {
                          {
                            currentPassword: 'Current password',
                            newPassword: 'New password',
                            confirmPassword: 'Confirm new password',
                          }[name]
                        }
                      </Label>
                      <Input
                        id={`${id}-${name}`}
                        type="password"
                        autoComplete={
                          name === 'currentPassword' ? 'current-password' : 'new-password'
                        }
                        maxLength={128}
                        minLength={name === 'currentPassword' ? undefined : 12}
                        value={field.state.value}
                        onChange={e => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        required
                      />
                      <FormFieldError meta={field.state.meta} />
                    </div>
                  )}
                </form.Field>
              ))}
              <form.Subscribe selector={state => state.isSubmitting}>
                {pending => (
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Saving…' : 'Change password'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          ) : (
            <p className="text-sm leading-6! text-muted-foreground">
              We’ll send a link to your email so you can add a password to your existing account.
            </p>
          )}
          <Button variant="outline" onClick={requestPassword} disabled={sending || cooldown}>
            {sending
              ? 'Requesting email…'
              : cooldown
                ? 'Email requested — wait a minute to resend'
                : password
                  ? 'Forgot your current password?'
                  : 'Email me a password link'}
          </Button>
        </section>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
