import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/lists/$cardListId/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Helmet title="Card List Details | SWUBase" />
      <div>Hello "/wantlists/$cardListId/"!</div>
    </>
  );
}
