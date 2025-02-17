import CollectionLayoutToggleGroup from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutToggleGroup.tsx';
import {
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutGroupBy from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutGroupBy.tsx';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import CollectionLayoutSortBy from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutSortBy.tsx';

interface CollectionLayoutSettingsProps {}

const CollectionLayoutSettings: React.FC<CollectionLayoutSettingsProps> = ({}) => {
  const { layout } = useCollectionLayoutStore();
  const { setLayout } = useCollectionLayoutStoreActions();

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex gap-2">
          <CollectionLayoutGroupBy />
          <CollectionLayoutSortBy />
          <CollectionLayoutToggleGroup value={layout} setValue={setLayout} />
        </div>
      </CardHeader>
    </Card>
  );
};

export default CollectionLayoutSettings;
