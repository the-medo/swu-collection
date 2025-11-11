import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/limited/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Basic page. Your latest pools, section to create pool, list of public pools.</div>;
}
