import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/app/pages/settings/SettingsPage.tsx';
import { z } from 'zod';

export const settingsPages: [string, ...string[]] = [
  'collections-and-wantlists',
  'display-name',
] as const;

const searchParams = z.object({
  page: z.enum([...settingsPages]).default('collections-and-wantlists'),
});

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
  validateSearch: searchParams,
});
