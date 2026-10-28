import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { authClient } from '@/lib/auth-client.ts';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Button } from '@/components/ui/button.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { authPasswordMinLength, authPasswordMaxLength } from '../../../../../shared/auth.ts';
import { emailAuthError } from './emailAuthErrors.ts';
import SignIn from './SignIn.tsx';
import { EmailAuthForm } from './EmailAuthForm.tsx';

export function ResetPasswordForm({ token }: { token: string }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [complete, setComplete] = useState(false);
  const form = useForm({
    defaultValues: { password: '', confirm: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      if (value.password !== value.confirm) {
        setError('The passwords do not match.');
        return;
      }
      try {
        const result = await authClient.resetPassword({ token, newPassword: value.password });
        if (result.error) {
          setError(emailAuthError(result.error));
          if (['INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(result.error.code ?? ''))
            setExpired(true);
        } else {
          form.reset();
          setComplete(true);
        }
      } catch {
        setError(emailAuthError(null));
      }
    },
  });
  if (complete)
    return (
      <div className="space-y-5">
        <p role="status" className="text-sm leading-6!">
          Your password is ready. Sign in to continue. Google and GitHub still work with your
          account.
        </p>
        <SignIn forceTextButton buttonText="Sign in" />
      </div>
    );
  if (expired)
    return (
      <div className="space-y-5">
        <p role="alert" className="text-sm">
          {error}
        </p>
        <EmailAuthForm initialMode="forgot-password" />
      </div>
    );
  return (
    <form
      data-auth-private
      className="amp-block space-y-4"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm leading-6! text-muted-foreground">
        Choose a password with at least 12 characters. Your other sessions will be signed out.
      </p>
      {(['password', 'confirm'] as const).map(name => (
        <form.Field
          key={name}
          name={name}
          validators={{
            onSubmit: ({ value }) =>
              value.length >= authPasswordMinLength && value.length <= authPasswordMaxLength
                ? undefined
                : 'Use 12–128 characters.',
          }}
        >
          {field => (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-${name}`}>
                {name === 'password' ? 'New password' : 'Confirm password'}
              </Label>
              <Input
                id={`${id}-${name}`}
                type="password"
                autoComplete="new-password"
                minLength={authPasswordMinLength}
                maxLength={authPasswordMaxLength}
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
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <form.Subscribe selector={state => state.isSubmitting}>
        {pending => (
          <Button type="submit" className="w-full rounded-xl" disabled={pending}>
            {pending ? 'Saving password…' : 'Save password'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
