import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPageFrame } from '@/components/app/auth/AuthPageFrame.tsx';
import { ResetPasswordForm } from '@/components/app/auth/ResetPasswordForm.tsx';
import { EmailAuthForm } from '@/components/app/auth/EmailAuthForm.tsx';
import { useEmailAuthConfig } from '@/api/auth/useEmailAuthConfig.ts';

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: z.object({
    token: z.string().max(512).optional().catch(undefined),
    error: z.string().max(100).optional().catch(undefined),
  }),
  component: ResetPage,
});
function ResetPage() {
  const { token, error } = Route.useSearch();
  const config = useEmailAuthConfig();
  return (
    <AuthPageFrame title="Set your password.">
      {config.data?.enabled ? (
        token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-5">
            {error && (
              <p role="alert" className="text-sm">
                This reset link is invalid or has expired. Request another below.
              </p>
            )}
            <EmailAuthForm initialMode="forgot-password" />
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          {config.isPending
            ? 'Loading…'
            : 'Password reset is currently unavailable. Please try again later.'}
        </p>
      )}
    </AuthPageFrame>
  );
}
