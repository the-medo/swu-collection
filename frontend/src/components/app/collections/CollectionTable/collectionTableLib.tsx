import { ColumnDef } from '@tanstack/react-table';
import { CollectionCard } from '../../../../../../types/CollectionCard.ts';

export const collectionTableLib: ColumnDef<CollectionCard>[] = [
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
