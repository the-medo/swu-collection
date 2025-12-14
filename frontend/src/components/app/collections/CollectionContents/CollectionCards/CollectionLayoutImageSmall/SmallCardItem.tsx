import React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import CollectionCardHoverDetail from '@/components/app/collections/CollectionCardDetail/CollectionCardHoverDetail.tsx';
import {
  useCCDetail,
  useCCCard,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { PriceBadge } from '@/components/app/card-prices/PriceBadge.tsx';
import { CardPriceSourceType } from '../../../../../../../../types/CardPrices.ts';

interface SmallCardItemProps {
  cardKey: string;
  collectionId: string;
  horizontal: boolean;
  currency: string;
  priceSourceType?: CardPriceSourceType | null;
}

const SmallCardItem: React.FC<SmallCardItemProps> = ({
  cardKey,
  collectionId,
  horizontal,
  currency,
  priceSourceType,
}) => {
  // Move hooks to the top level of this component
  const collectionCard = useCCDetail(cardKey);
  const card = useCCCard(cardKey);

  if (!collectionCard) return null;

  return (
    <CollectionCardHoverDetail
      key={cardKey}
      cardData={card}
      collectionId={collectionId}
      collectionCard={collectionCard}
      priceSourceType={priceSourceType}
    >
      <div
        className="max-w-[100px] flex flex-col gap-1 bg-secondary gray-200 rounded-lg"
        key={`${collectionCard.variantId}-${collectionCard.foil}`}
      >
        <CardImage
          card={card}
          cardVariantId={collectionCard.variantId}
          size="w100"
          foil={collectionCard.foil}
          forceHorizontal={horizontal}
          backSideButton={false}
        >
          <div className="absolute bottom-0 right-0 w-fit flex grow-0 items-end gap-1 mr-1 mb-1">
            {priceSourceType ? (
              <div>
                <PriceBadge
                  cardId={collectionCard.cardId}
                  variantId={collectionCard.variantId}
                  sourceType={priceSourceType}
                  displayLogo={false}
                  displayTooltip={false}
                  moveTop={true}
                />
              </div>
            ) : null}
            <div className="bg-background opacity-90 rounded-lg">
              <div className="font-medium text-sm px-2">{collectionCard.amount}x</div>
            </div>
          </div>
        </CardImage>
        {collectionCard.price && (
          <div className="text-xs p-1 pt-0 text-secondary-foreground text-right">
            {collectionCard.price} {currency}
          </div>
        )}
      </div>
    </CollectionCardHoverDetail>
  );
};

export default SmallCardItem;
