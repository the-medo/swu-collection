import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import CreatorStudio from '@/components/app/creators/CreatorStudio.tsx';
export const Route = createFileRoute('/_authenticated/creator-studio')({
  validateSearch: z.object({
    creatorId: z.uuid().optional().catch(undefined),
    page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
    creationId: z.uuid().optional().catch(undefined),
    youtube: z.enum(['connected', 'failed']).optional().catch(undefined),
    youtubeChannelId: z
      .string()
      .regex(/^UC[\w-]{22}$/)
      .optional()
      .catch(undefined),
  }),
  component: Page,
});
function Page() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  return (
    <CreatorStudio
      search={search}
      onChange={patch => {
        void navigate({
          search: previous => ({
            ...previous,
            youtube: undefined,
            youtubeChannelId: undefined,
            ...patch,
          }),
          resetScroll: false,
        });
      }}
    />
  );
}
