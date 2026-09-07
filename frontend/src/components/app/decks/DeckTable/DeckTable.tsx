import { DataTable } from '@/components/ui/data-table.tsx';
import { useDeckTableColumns } from './useDeckTableColumns.tsx';
import { UserDeckData } from './deckTableLib.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';

interface DeckTableProps {
  variant: 'user' | 'public';
  decks: UserDeckData[];
  loading?: boolean;
  selectable?: boolean;
  selectionLimit?: number;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}

const DeckTable: React.FC<DeckTableProps> = ({
  variant,
  decks,
  loading = false,
  selectable = false,
  selectionLimit,
  rowSelection,
  onRowSelectionChange,
}) => {
  const { isMobile } = useSidebar();
  const view = isMobile ? 'box' : 'table';

  const columns = useDeckTableColumns({
    showOwner: variant === 'public',
    showPublic: variant !== 'public',
    view,
    isCompactBoxView: false, //view === 'box',
    showSelection: selectable,
    selectionLimit,
  });

  return (
    <DataTable
      columns={columns}
      data={decks}
      loading={loading}
      view={view}
      enableRowSelection={selectable}
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      getRowId={(row, index) => row.deck?.id ?? `skeleton-${index}`}
    />
  );
};

export default DeckTable;
