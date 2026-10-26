import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthPageFrame } from '@/components/app/auth/AuthPageFrame.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { safeAuthReturnTo } from '../../../shared/auth.ts';

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: z.object({
    returnTo: z.string().optional().catch(undefined).transform(safeAuthReturnTo),
  }),
  component: SignInPage,
});
function SignInPage() {
  const { returnTo } = Route.useSearch();
  return (
    <AuthPageFrame title="Welcome to your base.">
      <p className="mb-5 text-sm text-muted-foreground">
        Sign in to access your decks, collection, and community.
      </p>
      <SignIn defaultOpen returnTo={returnTo} forceTextButton />
    </AuthPageFrame>
  );
}
