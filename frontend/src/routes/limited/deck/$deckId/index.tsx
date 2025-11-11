import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/limited/deck/$deckId/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/limited/deck/"!</div>;
}
