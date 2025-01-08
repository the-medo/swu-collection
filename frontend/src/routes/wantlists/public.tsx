import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/wantlists/public')({
  component: PublicWantlists,
});

function PublicWantlists() {
  return (
    <div className="p-2">
      <h3>Welcome in public wantlists!</h3>
    </div>
  );
}
