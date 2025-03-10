import * as React from 'react';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { ViewProps } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchResults.tsx';

export const GridView: React.FC<ViewProps> = ({ cardListData, searchResults, onCardClick }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {searchResults.map(cardId => {
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        const defaultVariant = selectDefaultVariant(card);

        return (
          <div
            key={cardId}
            className="cursor-pointer hover:scale-105 transition-transform"
            onClick={() => onCardClick(cardId)}
          >
            <CardImage
              card={card}
              cardVariantId={defaultVariant}
              size="w100"
              backSideButton={false}
            />
            <div className="mt-1 text-sm font-medium text-center truncate" title={card.name}>
              {card.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
