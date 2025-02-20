import CollectionFilterInput from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionFilterInput.tsx';
import CollectionLayoutToggleGroup from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutToggleGroup.tsx';
import {
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionFilterProps {}

const CollectionFilter: React.FC<CollectionFilterProps> = ({}) => {
  const { layout } = useCollectionLayoutStore();
  const { setLayout } = useCollectionLayoutStoreActions();

  return (
    <div className="flex gap-2">
      <CollectionFilterInput />
      <CollectionLayoutToggleGroup value={layout} setValue={setLayout} />
    </div>
  );
};

export default CollectionFilter;
