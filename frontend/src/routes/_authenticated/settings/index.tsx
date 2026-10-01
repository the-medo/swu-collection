import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/app/pages/settings/SettingsPage.tsx';
import { z } from 'zod';
import { settingsPageIds } from '@/components/app/pages/settings/settingsNavigation.ts';

// Preserve the existing search type shared with legacy consumers of `page`.
const settingsPages: string[] = settingsPageIds;

const searchParams = z.object({
  page: z.enum(settingsPages).default('collections-and-wantlists'),
});

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
  validateSearch: searchParams,
});
