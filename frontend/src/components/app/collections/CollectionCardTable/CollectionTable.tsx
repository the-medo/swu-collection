import { DataTable } from '@/components/ui/data-table.tsx';
import { collectionTableLib } from './collectionTableLib';
import { ZCollection } from '../../../../../../types/ZCollection.ts';

interface CollectionTableProps {
  collections: ZCollection[];
  loading?: boolean;
}

const CollectionTable: React.FC<CollectionTableProps> = ({ collections, loading = false }) => {
  return (
    <div className="w-full">
      <DataTable columns={collectionTableLib} data={collections} loading={loading} />
    </div>
  );
};

export default CollectionTable;
