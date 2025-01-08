import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/wantlists/your')({
  component: YourWantlists,
});

function YourWantlists() {
  return (
    <div className="p-2">
      <h3>Welcome in your wantlists!</h3>
    </div>
  );
}
