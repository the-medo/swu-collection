import { ZCollection } from '../../../../../../types/ZCollection.ts';
import { User } from '../../../../../../types/User.ts';
import { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import { CollectionCardIdentification } from '@/api/usePutCollectionCard.ts';

export type UserCollectionData = {
  user: User;
  collection: ZCollection;
};

export const getIdentificationFromCollectionCard = (
  collectionCard: CollectionCard,
): CollectionCardIdentification => ({
  cardId: collectionCard.cardId,
  variantId: collectionCard.variantId,
  foil: collectionCard.foil,
  condition: Number(collectionCard.condition),
  language: collectionCard.language,
});
