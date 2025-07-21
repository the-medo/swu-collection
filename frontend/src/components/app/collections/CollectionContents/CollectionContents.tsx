import CollectionLayoutSettings from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutSettings.tsx';
import CollectionGroups from '@/components/app/collections/CollectionContents/CollectionGroups/CollectionGroups.tsx';
import CollectionFilter from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionFilter.tsx';
import { useCollectionGroupData } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupData.ts';
import {
  useCollectionGroupStoreLoadedCollectionId,
  useCollectionGroupStoreLoading,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { cn } from '@/lib/utils.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { ROOT_GROUP_ID } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

interface CollectionContentsProps {
  collectionId: string;
}

const CollectionContents: React.FC<CollectionContentsProps> = ({ collectionId }) => {
  // Use the new hook to initialize data
  useCollectionGroupData(collectionId);

  // Get loading state from the store
  const loading = useCollectionGroupStoreLoading();
  const loadedCollectionId = useCollectionGroupStoreLoadedCollectionId();

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
        {loadedCollectionId === collectionId && (
          <CollectionGroups collectionId={collectionId} groupId={ROOT_GROUP_ID} />
        )}
      </div>
    </div>
  );
};

export default CollectionContents;
