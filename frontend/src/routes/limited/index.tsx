import { createFileRoute } from '@tanstack/react-router';
import Limited from '@/components/app/limited/Limited.tsx';

export const Route = createFileRoute('/limited/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Limited />;
}
