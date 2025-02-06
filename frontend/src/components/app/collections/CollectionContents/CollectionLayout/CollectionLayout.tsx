import CollectionLayoutToggleGroup from '@/components/app/collections/CollectionContents/CollectionLayout/CollectionLayoutToggleGroup.tsx';
import {
  useCollectionLayoutStore,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionLayout/useCollectionLayoutStore.ts';

interface CollectionLayoutProps {}

const CollectionLayout: React.FC<CollectionLayoutProps> = ({}) => {
  const { layout } = useCollectionLayoutStore();
  const { setLayout } = useCollectionLayoutStoreActions();

  return <CollectionLayoutToggleGroup value={layout} setValue={setLayout} />;
};

export default CollectionLayout;
