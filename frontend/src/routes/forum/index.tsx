import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ForumPage from '@/components/app/forum/ForumPage.tsx';
import { discussionTypes } from '../../../../shared/types/discussions.ts';

export const Route = createFileRoute('/forum/')({
  validateSearch: z.object({
    forumType: z.enum(discussionTypes).optional().catch(undefined),
  }),
  component: ForumPage,
});
