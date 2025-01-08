import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/collections/your')({
  component: YourCollections,
});

function YourCollections() {
  return (
    <div className="p-2">
      <h3>Welcome in your collections!</h3>
    </div>
  );
}
