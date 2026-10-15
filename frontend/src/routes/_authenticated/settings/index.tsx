import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/app/pages/settings/SettingsPage.tsx';
import { z } from 'zod';
import { settingsPageIds } from '@/components/app/pages/settings/settingsNavigation.ts';

// Preserve the existing search type shared with legacy consumers of `page`.
const settingsPages: string[] = settingsPageIds;

const searchParams = z
  .object({
    uploadView: z.enum(['images', 'albums', 'galleries']).optional().catch(undefined),
    gallery: z.uuid().optional().catch(undefined),
    album: z.uuid().optional().catch(undefined),
    page: z.preprocess(
      value => (value === 'display-name' ? 'profile' : value),
      z.enum(settingsPages).default('profile'),
    ),
  })
  .transform(({ gallery, ...search }) => ({
    ...search,
    // Explicitly clear the legacy key: the router merges validated search with the URL.
    gallery: undefined,
    uploadView: search.uploadView === 'galleries' ? ('albums' as const) : search.uploadView,
    album: search.album ?? gallery,
  }));

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
  validateSearch: searchParams,
});
