import { DataTable } from '@/components/ui/data-table.tsx';
import { useCollectionTableColumns } from '@/components/app/collections/CollectionCardTable/useCollectionTableColumns.tsx';
import { UserCollectionData } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

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
  const { isMobile } = useSidebar();
  const view = isMobile ? 'box' : 'table';

  const columns = useCollectionTableColumns({
    view,
    showOwner: variant === 'public',
    showState: variant === 'public',
    showCurrency: variant === 'public',
    showPublic: variant !== 'public',
  });

  return <DataTable columns={columns} data={collections} loading={loading} view={view} />;
};

export default CollectionTable;
