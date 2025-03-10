import * as React from 'react';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { ViewProps } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/AdvancedSearchResults.tsx';

export const ListView: React.FC<ViewProps> = ({ cardListData, searchResults, onCardClick }) => {
  return (
    <div className="space-y-2">
      {searchResults.map(cardId => {
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        const defaultVariant = selectDefaultVariant(card);

        return (
          <HoverCard key={cardId} openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div
                className="flex items-center p-2 rounded-md border cursor-pointer hover:bg-accent"
                onClick={() => onCardClick(cardId)}
              >
                <div className="w-12 h-12 mr-3 flex-shrink-0">
                  <CardImage
                    card={card}
                    cardVariantId={defaultVariant}
                    size="w50"
                    backSideButton={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.type}
                    {card.cost !== null && ` • Cost: ${card.cost}`}
                    {card.arenas.length > 0 && ` • ${card.arenas.join(', ')}`}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-muted-foreground">
                  {card.aspects.join(', ')}
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="right" className="p-0 border-0">
              <CardImage card={card} cardVariantId={defaultVariant} size="w200" />
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
};
