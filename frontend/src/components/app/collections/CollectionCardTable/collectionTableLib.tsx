import { ZCollection } from '../../../../../../types/ZCollection.ts';
import { User } from '@/hooks/useUser.ts';

export type CollectionTableData = {
  user: User;
} & ZCollection;
