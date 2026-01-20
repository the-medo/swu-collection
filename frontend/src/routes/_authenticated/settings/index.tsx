import { createFileRoute } from '@tanstack/react-router';
import UserSettings from '@/components/app/pages/settings/UserSettings.tsx';
import CollectionAndWantlistSettings from '@/components/app/pages/settings/CollectionAndWantlistSettings.tsx';

export const Route = createFileRoute('/_authenticated/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-2 flex flex-col gap-16">
      <UserSettings />
      <CollectionAndWantlistSettings />
    </div>
  );
}
