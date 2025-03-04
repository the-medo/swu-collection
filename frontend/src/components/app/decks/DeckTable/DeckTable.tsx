import { DataTable } from '@/components/ui/data-table.tsx';
import { useDeckTableColumns } from './useDeckTableColumns.tsx';
import { UserDeckData } from './deckTableLib.tsx';

interface DeckTableProps {
  variant: 'user' | 'public';
  decks: UserDeckData[];
  loading?: boolean;
}

const DeckTable: React.FC<DeckTableProps> = ({ variant, decks, loading = false }) => {
  const columns = useDeckTableColumns(
    variant === 'public'
      ? {
          showOwner: true,
        }
      : {
          showPublic: true,
        },
  );

  return <DataTable columns={columns} data={decks} loading={loading} />;
};

export default DeckTable;
