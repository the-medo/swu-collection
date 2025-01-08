import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/collections/new')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/collections/new"!</div>;
}
