import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/lists/$cardListId/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/wantlists/$cardListId/"!</div>;
}
