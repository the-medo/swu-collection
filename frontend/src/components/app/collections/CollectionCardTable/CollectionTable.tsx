import { DataTable } from '@/components/ui/data-table.tsx';
import { useCollectionTableColumns } from '@/components/app/collections/CollectionCardTable/useCollectionTableColumns.tsx';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';

interface CollectionTableProps {
  variant: 'user' | 'public';
  collections: UserCollectionData[];
  loading?: boolean;
}

const CollectionTable: React.FC<CollectionTableProps> = ({
  variant,
  collections,
  loading = false,
}) => {
  const columns = useCollectionTableColumns(
    variant === 'public'
      ? {
          showOwner: true,
          showState: true,
          showCurrency: true,
        }
      : {
          showPublic: true,
        },
  );

  return <DataTable columns={columns} data={collections} loading={loading} />;
};

export default CollectionTable;
