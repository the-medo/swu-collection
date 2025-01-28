import { ColumnDef } from '@tanstack/react-table';
import { ZCollection } from '../../../../../../types/ZCollection.ts';

export const collectionTableLib: ColumnDef<ZCollection>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'public',
    header: 'Public',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated At',
  },
];
