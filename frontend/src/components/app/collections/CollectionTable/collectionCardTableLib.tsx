import { ColumnDef } from '@tanstack/react-table';
import { ZCollectionCard } from '../../../../../../types/ZCollectionCard.ts';

export const collectionCardTableLib: ColumnDef<ZCollectionCard>[] = [
  {
    accessorKey: 'set',
    header: 'Set',
  },
  {
    accessorKey: 'setNumber',
    header: 'Number',
  },
  {
    accessorKey: 'owned',
    header: 'Owned',
  },
  {
    accessorKey: 'foil',
    header: 'Foil',
  },
  {
    accessorKey: 'hyperspace',
    header: 'HS',
  },
];
