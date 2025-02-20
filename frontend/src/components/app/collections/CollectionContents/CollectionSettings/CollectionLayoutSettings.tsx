import CollectionLayoutGroupBy from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutGroupBy.tsx';
import CollectionLayoutSortBy from '@/components/app/collections/CollectionContents/CollectionSettings/CollectionLayoutSortBy.tsx';

interface CollectionLayoutSettingsProps {}

const CollectionLayoutSettings: React.FC<CollectionLayoutSettingsProps> = ({}) => {
  return (
    <div className="flex gap-2 justify-between pl-2">
      <CollectionLayoutGroupBy />
      <CollectionLayoutSortBy />
    </div>
  );
};

export default CollectionLayoutSettings;
