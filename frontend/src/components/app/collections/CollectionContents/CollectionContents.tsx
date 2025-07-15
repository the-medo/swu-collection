import CollectionLayoutSettings from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutSettings.tsx';
import CollectionGroups from '@/components/app/collections/CollectionContents/CollectionGroups/CollectionGroups.tsx';
import CollectionFilter from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionFilter.tsx';
import { useCollectionGroupData } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupData.ts';
import {
  useCollectionGroup,
  useCollectionGroupStore,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { cn } from '@/lib/utils.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';

interface CollectionContentsProps {
  collectionId: string;
}

const CollectionContents: React.FC<CollectionContentsProps> = ({ collectionId }) => {
  // Use the new hook to initialize data
  useCollectionGroupData(collectionId);

  const group = useCollectionGroup(collectionId);

  console.log({ group });

  // Get loading state from the store
  const { loading } = useCollectionGroupStore();

  return (
    <div className="flex flex-col gap-2 w-full">
      <Card>
        <CardHeader className="p-2 flex flex-col gap-2">
          <CollectionLayoutSettings />
          <CollectionFilter />
        </CardHeader>
      </Card>
      <div
        className={cn('flex flex-col md:flex-row', {
          'opacity-50': loading,
        })}
      >
        <CollectionGroups depth={0} collectionId={collectionId} />
      </div>
    </div>
  );
};

export default CollectionContents;
