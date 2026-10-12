import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ForumThreadPage from '@/components/app/forum/ForumThreadPage.tsx';

export const Route = createFileRoute('/forum/$discussionId')({
  validateSearch: z.object({ forumComment: z.guid().optional().catch(undefined) }),
  component: Page,
});
function Page() {
  const { discussionId } = Route.useParams();
  const { forumComment } = Route.useSearch();
  return <ForumThreadPage key={discussionId} id={discussionId} focusCommentId={forumComment} />;
}
