import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import AuthErrorPage from '@/components/app/auth/AuthErrorPage';

export const Route = createFileRoute('/auth/error')({
  validateSearch: z.object({ error: z.string().max(100).optional().catch(undefined) }),
  component: AuthErrorRoute,
});

function AuthErrorRoute() {
  const { error } = Route.useSearch();
  return <AuthErrorPage error={error} />;
}
