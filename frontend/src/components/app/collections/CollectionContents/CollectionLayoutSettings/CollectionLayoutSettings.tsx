import CollectionLayoutToggleGroup from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutToggleGroup.tsx';
import {
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import CollectionLayoutGroupBy from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutGroupBy.tsx';
import { Card, CardHeader } from '@/components/ui/card.tsx';

interface CollectionLayoutSettingsProps {}

const CollectionLayoutSettings: React.FC<CollectionLayoutSettingsProps> = ({}) => {
  const { layout } = useCollectionLayoutStore();
  const { setLayout } = useCollectionLayoutStoreActions();

  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex gap-2">
          <CollectionLayoutGroupBy />
          <CollectionLayoutToggleGroup value={layout} setValue={setLayout} />
        </div>
      </CardHeader>
    </Card>
  );
};

export default CollectionLayoutSettings;
