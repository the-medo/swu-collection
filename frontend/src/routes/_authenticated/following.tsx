import { createFileRoute } from '@tanstack/react-router';
import { FollowingPage } from '@/components/app/follows/FollowingPage.tsx';
import { followingQuerySchema } from '../../../../shared/types/follows.ts';

export const Route = createFileRoute('/_authenticated/following')({
  validateSearch: followingQuerySchema.extend({
    kind: followingQuerySchema.shape.kind.default('creators').catch('creators'),
    page: followingQuerySchema.shape.page.catch(1),
  }),
  component: FollowingPage,
});
