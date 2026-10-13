import { createFileRoute } from '@tanstack/react-router';
import { CreatorDirectory } from '@/components/app/creators/CreatorPages.tsx';
export const Route = createFileRoute('/creators/')({ component: CreatorDirectory });
