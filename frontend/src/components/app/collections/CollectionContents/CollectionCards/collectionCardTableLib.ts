import { CardList } from '../../../../../../../lib/swu-resources/types';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

export interface CollectionCardTableColumnsProps {
  collectionId: string;
  cardList: CardList | undefined;
  layout: CollectionLayout | 'table-duplicate';
  forceHorizontal?: boolean;
}
