import React from 'react';
import MissingCardsActionStep1 from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsActionStep1.tsx';
import { AddMultipleCollectionCardsItem } from '@/api/collections/useAddMultipleCollectionCards.ts';

export interface MissingCardsActionProps {
  items: AddMultipleCollectionCardsItem[];
}

const MissingCardsAction: React.FC<MissingCardsActionProps> = ({ items }) => {
  return <MissingCardsActionStep1 items={items} />;
};

export default MissingCardsAction;
