import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/messages/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Not implemented yet</div>;
}
