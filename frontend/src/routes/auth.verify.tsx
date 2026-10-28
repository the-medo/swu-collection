import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPageFrame } from '@/components/app/auth/AuthPageFrame.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { EmailAuthForm } from '@/components/app/auth/EmailAuthForm.tsx';
import { useEmailAuthConfig } from '@/api/auth/useEmailAuthConfig.ts';
import { safeAuthReturnTo } from '../../../shared/auth.ts';

export const Route = createFileRoute('/auth/verify')({
  validateSearch: z.object({
    error: z.string().max(100).optional().catch(undefined),
    verified: z.boolean().optional().catch(false),
    returnTo: z.string().optional().catch(undefined).transform(safeAuthReturnTo),
  }),
  component: VerifyPage,
});
function VerifyPage() {
  const { error, verified, returnTo } = Route.useSearch();
  const config = useEmailAuthConfig();
  const success = !error && verified === true;
  return (
    <AuthPageFrame title={success ? 'Email verified.' : 'Verify your email.'}>
      {success ? (
        <div className="space-y-5">
          <p role="status" className="text-sm leading-6!">
            Your email is verified. Sign in with your password or use Google with the same email
            address.
          </p>
          <SignIn returnTo={returnTo} forceTextButton />
        </div>
      ) : (
        <div className="space-y-5">
          {error && (
            <p role="alert" className="text-sm leading-6!">
              This verification link is invalid or has expired. Request a new email below.
            </p>
          )}
          {config.data?.enabled ? (
            <EmailAuthForm initialMode="verify" returnTo={returnTo} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {config.isPending
                ? 'Loading…'
                : 'Email verification is currently unavailable. Please try again later.'}
            </p>
          )}
          <SignIn buttonText="Use Google or GitHub" forceTextButton />
        </div>
      )}
    </AuthPageFrame>
  );
}
