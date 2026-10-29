import { createFileRoute, redirect } from '@tanstack/react-router';
import CreatorStudioPage from '@/components/app/creators/CreatorStudioPage.tsx';

export const Route = createFileRoute('/_authenticated/creator-studio/')({
  beforeLoad: ({ search }) => {
    // Existing OAuth callback URLs remain valid and finish in the video workspace.
    if (search.youtube) throw redirect({ to: '/creator-studio/videos', search, replace: true });
  },
  component: () => <CreatorStudioPage section="overview" />,
});
