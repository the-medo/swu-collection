import { createFileRoute, Outlet } from '@tanstack/react-router';
import { creatorPageSearchSchema } from '@/components/app/creators/creatorPageSearch.ts';
export const Route = createFileRoute('/creators/$slug')({
  validateSearch: creatorPageSearchSchema,
  component: Outlet,
});
