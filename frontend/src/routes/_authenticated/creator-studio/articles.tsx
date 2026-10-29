import { createFileRoute } from '@tanstack/react-router';
import CreatorStudioPage from '@/components/app/creators/CreatorStudioPage.tsx';

export const Route = createFileRoute('/_authenticated/creator-studio/articles')({
  component: () => <CreatorStudioPage section="articles" />,
});
