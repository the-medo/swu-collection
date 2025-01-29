import { DataTable } from '@/components/ui/data-table.tsx';
import { ZCollection } from '../../../../../../types/ZCollection.ts';
import { useCollectionTableColumns } from '@/components/app/collections/CollectionCardTable/useCollectionTableColumns.tsx';
import { useUser } from '@/hooks/useUser.ts';

interface CollectionTableProps {
  collections: ZCollection[];
  loading?: boolean;
}

const CollectionTable: React.FC<CollectionTableProps> = ({ collections, loading = false }) => {
  const user = useUser();

  const columns = useCollectionTableColumns({
    showPublic: true,
    showOwner: true,
    showState: true,
    showCurrency: true,
  });

  const tableData = user
    ? collections.map(c => ({
        user: user!,
        ...c,
      }))
    : [];

  return (
    <div className="w-full">
      <DataTable columns={columns} data={tableData} loading={loading || !user} />
    </div>
  );
};

export default CollectionTable;
