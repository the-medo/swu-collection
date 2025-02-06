import CollectionLayoutToggleGroup from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutToggleGroup.tsx';
import {
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import CollectionLayoutGroupBy from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutGroupBy.tsx';

interface CollectionLayoutSettingsProps {}

const CollectionLayoutSettings: React.FC<CollectionLayoutSettingsProps> = ({}) => {
  const { layout } = useCollectionLayoutStore();
  const { setLayout } = useCollectionLayoutStoreActions();

  return (
    <div className="flex gap-2">
      <CollectionLayoutGroupBy />
      <CollectionLayoutToggleGroup value={layout} setValue={setLayout} />
    </div>
  );
};

export default CollectionLayoutSettings;
