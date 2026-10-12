import { createFileRoute } from '@tanstack/react-router';
import NewForumThread from '@/components/app/forum/NewForumThread.tsx';

export const Route = createFileRoute('/forum/new')({ component: NewForumThread });
