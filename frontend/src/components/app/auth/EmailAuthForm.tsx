import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Loader2, MailCheck } from 'lucide-react';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { authPasswordMaxLength, safeAuthReturnTo } from '../../../../../shared/auth.ts';
import { emailAuthError } from './emailAuthErrors.ts';

export type EmailAuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify';
export function EmailAuthForm({
  initialMode = 'sign-in',
  returnTo = '/',
  disabled = false,
  onPendingChange,
  onNavigate,
}: {
  initialMode?: EmailAuthMode;
  returnTo?: string;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onNavigate?: () => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<EmailAuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [cooldowns, setCooldowns] = useState({ verify: 0, 'forgot-password': 0 });
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const destination = safeAuthReturnTo(returnTo);
  const verifyCallback = `${window.location.origin}/auth/verify?verified=true&returnTo=${encodeURIComponent(destination)}`;
  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    onSubmit: async ({ value }) => {
      if (pending || disabled) return;
      setPending(true);
      onPendingChange?.(true);
      setError(null);
      setNotice(null);
      const email = value.email.trim().toLowerCase();
      let navigating = false;
      try {
        if (mode === 'sign-in') {
          sessionStorage.setItem('needsSettingsSync', '1');
          const result = await authClient.signIn.email({ email, password: value.password });
          if (result.error) {
            setError(emailAuthError(result.error));
            setCanResend(result.error.code === 'EMAIL_NOT_VERIFIED');
          } else {
            navigating = true;
            onNavigate?.();
            // Better Auth follows OAuth consent redirects itself (for MCP).
            if (!result.data?.redirect || !result.data.url) window.location.assign(destination);
          }
        } else if (mode === 'sign-up') {
          const result = await authClient.signUp.email({
            email,
            password: crypto.randomUUID() + crypto.randomUUID(),
            name: value.name.trim(),
            callbackURL: verifyCallback,
          });
          if (result.error) setError(emailAuthError(result.error));
          else {
            setMode('verify');
            form.setFieldValue('password', '');
            setNotice(
              'Check your inbox for the next step. If you already have an account, we’ll help you sign in to it.',
            );
            setCooldowns(previous => ({ ...previous, verify: Date.now() + 60_000 }));
          }
        } else {
          if (Date.now() < cooldowns[mode]) {
            setNotice('Please wait a minute before requesting another email.');
            return;
          }
          const result =
            mode === 'verify'
              ? await authClient.sendVerificationEmail({ email, callbackURL: verifyCallback })
              : await authClient.requestPasswordReset({
                  email,
                  redirectTo: `${window.location.origin}/auth/reset-password`,
                });
          if (result.error) setError(emailAuthError(result.error));
          else {
            setNotice(
              mode === 'verify'
                ? 'If this address needs verification, an email is on its way. Check your inbox and spam folder.'
                : 'If an account exists for this address, an email is on its way. You can use it to add or reset your password.',
            );
            setCooldowns(previous => ({ ...previous, [mode]: Date.now() + 60_000 }));
          }
        }
      } catch {
        setError(emailAuthError(null));
      } finally {
        if (!navigating) {
          setPending(false);
          onPendingChange?.(false);
        }
      }
    },
  });
  function switchMode(next: EmailAuthMode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setCanResend(false);
    form.reset({
      name: form.getFieldValue('name'),
      email: form.getFieldValue('email'),
      password: '',
    });
  }
  const title = {
    'sign-in': 'Sign in with email',
    'sign-up': 'Create your account',
    'forgot-password': 'Set or reset your password',
    verify: 'Check your email',
  }[mode];
  return (
    <div className="amp-block space-y-4" data-auth-private>
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0! text-base! font-semibold!">{title}</h3>
        {(mode === 'sign-in' || mode === 'sign-up') && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="-mr-2 text-xs"
            disabled={pending || disabled}
            onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          >
            {mode === 'sign-in' ? 'Create account' : 'Sign in instead'}
          </Button>
        )}
      </div>
      {mode === 'verify' && (
        <p className="text-sm leading-6! text-muted-foreground">
          Use the link in your email to verify your address and choose a password. Then you can sign
          in here or use Google with the same email address.
        </p>
      )}
      {mode === 'sign-up' && (
        <p className="text-sm leading-6! text-muted-foreground">
          We’ll email you a link to verify your address and choose a password.
        </p>
      )}
      {mode === 'forgot-password' && (
        <p className="text-sm leading-6! text-muted-foreground">
          Already using Google or GitHub? This adds a password to the same account.
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <fieldset className="space-y-4" disabled={pending || disabled}>
          <form.Field
            name="name"
            validators={{
              onSubmit: ({ value }) =>
                mode !== 'sign-up' || (value.trim().length > 0 && value.trim().length <= 80)
                  ? undefined
                  : 'Enter a name, up to 80 characters.',
            }}
          >
            {field =>
              mode === 'sign-up' ? (
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-name`}>Name</Label>
                  <Input
                    id={`${id}-name`}
                    autoComplete="name"
                    maxLength={80}
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    required
                  />
                  <FormFieldError meta={field.state.meta} />
                </div>
              ) : null
            }
          </form.Field>
          <form.Field
            name="email"
            validators={{
              onSubmit: ({ value }) =>
                z.email().safeParse(value.trim()).success
                  ? undefined
                  : 'Enter a valid email address.',
            }}
          >
            {field => (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-email`}>Email</Label>
                <Input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  value={field.state.value}
                  onChange={e => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  required
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          <form.Field
            name="password"
            validators={{
              onSubmit: ({ value }) =>
                mode !== 'sign-in' || (value.length >= 1 && value.length <= authPasswordMaxLength)
                  ? undefined
                  : 'Use 12–128 characters.',
            }}
          >
            {field =>
              mode === 'sign-in' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${id}-password`}>Password</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      aria-pressed={showPassword}
                      aria-controls={`${id}-password`}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide password' : 'Show password'}
                    </button>
                  </div>
                  <Input
                    id={`${id}-password`}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    maxLength={authPasswordMaxLength}
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    required
                  />
                  <FormFieldError meta={field.state.meta} />
                </div>
              ) : null
            }
          </form.Field>
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {mode === 'sign-up'
              ? 'Create account'
              : mode === 'sign-in'
                ? 'Sign in'
                : mode === 'verify'
                  ? 'Resend verification email'
                  : 'Send password reset email'}
          </Button>
        </fieldset>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-5!"
        >
          {error}
        </p>
      )}
      {notice && (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm leading-6"
        >
          <MailCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        {mode === 'sign-in' ? (
          <button
            type="button"
            disabled={pending || disabled}
            className="text-muted-foreground underline underline-offset-4"
            onClick={() => switchMode('forgot-password')}
          >
            Forgot password?
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || disabled}
            className="text-muted-foreground underline underline-offset-4"
            onClick={() => switchMode('sign-in')}
          >
            Back to sign in
          </button>
        )}
        {canResend && (
          <button
            type="button"
            disabled={pending || disabled}
            className="underline underline-offset-4"
            onClick={() => switchMode('verify')}
          >
            Resend verification email
          </button>
        )}
      </div>
    </div>
  );
}
