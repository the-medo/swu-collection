import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/about')({
  component: About,
});

function About() {
  return (
    <>
      <Helmet title="About SWUBase | Star Wars: Unlimited Community Platform" />
      <div className="p-2">
        <h3>Welcome in about!</h3>
      </div>
    </>
  );
}
