import { createFileRoute } from '@tanstack/react-router';
import CollectionSizeCard from '@/components/app/collections/CollectionSizeCard/CollectionSizeCard.tsx';
import CollectionTable from '@/components/app/collections/CollectionTable/CollectionTable.tsx';

export const Route = createFileRoute('/collections/your')({
  component: YourCollections,
});

function YourCollections() {
  return (
    <div className="p-2">
      <div className="flex gap-4 items-start">
        <CollectionTable />
        <CollectionSizeCard />
      </div>
    </div>
  );
}
