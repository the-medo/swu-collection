import { DataTable } from '@/components/ui/data-table.tsx';
import { useDeckTableColumns } from './useDeckTableColumns.tsx';
import { UserDeckData } from './deckTableLib.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

interface DeckTableProps {
  variant: 'user' | 'public';
  decks: UserDeckData[];
  loading?: boolean;
}

const DeckTable: React.FC<DeckTableProps> = ({ variant, decks, loading = false }) => {
  const { isMobile } = useSidebar();
  const view = isMobile ? 'box' : 'table';

  const columns = useDeckTableColumns({
    showOwner: variant === 'public',
    showPublic: variant !== 'public',
    view,
    isCompactBoxView: false, //view === 'box',
  });

  return <DataTable columns={columns} data={decks} loading={loading} view={view} />;
};

export default DeckTable;
