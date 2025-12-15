import React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import CollectionCardInput from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';
import CollectionCardSelectionInput from '@/components/app/collections/CollectionCardSelection/CollectionCardSelectionInput.tsx';
import {
  useCCDetail,
  useCCCard,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { PriceBadge } from '@/components/app/card-prices/PriceBadge.tsx';
import { CardPriceSourceType } from '../../../../../../../../types/CardPrices.ts';

interface BigCardItemProps {
  collectionId: string;
  cardKey: string;
  horizontal: boolean;
  currency: string;
  owned: boolean;
  onChange: any; // Using any for simplicity, should be properly typed in a real application
  priceSourceType?: CardPriceSourceType | null;
}

const BigCardItem: React.FC<BigCardItemProps> = ({
  collectionId,
  cardKey,
  horizontal,
  currency,
  owned,
  onChange,
  priceSourceType,
}) => {
  // Move hooks to the top level of this component
  const collectionCard = useCCDetail(cardKey);
  const card = useCCCard(cardKey);

  if (!card) {
    return (
      <div className="max-w-[200px] flex flex-col gap-1 rounded-lg bg-secondary">
        <div>Loading...</div>
      </div>
    );
  }

  if (!collectionCard) return null;

  const id = getIdentificationFromCollectionCard(collectionCard);

  return (
    <div className="max-w-[200px] flex flex-col gap-1 rounded-lg bg-secondary" key={cardKey}>
      <CardImage
        card={card}
        cardVariantId={collectionCard.variantId}
        backSideButton={'left'}
        size="w200"
        foil={collectionCard.foil}
        forceHorizontal={horizontal}
      >
        {(collectionCard.price || owned) && (
          <div className="absolute bottom-0 right-0 left-0 min-w-20 flex grow-0 items-center gap-1 bg-secondary/80 py-2 px-2 mr-0 mb-0">
            <div className="flex gap-2 items-center w-full justify-end">
              {priceSourceType ? (
                <PriceBadge
                  cardId={collectionCard.cardId}
                  variantId={collectionCard.variantId}
                  sourceType={priceSourceType}
                  displayLogo={false}
                  displayTooltip={true}
                />
              ) : null}
              {owned ? (
                <div>
                  <CollectionCardInput
                    inputId={`${cardKey}-price`}
                    id={id}
                    field="price"
                    value={collectionCard.price as unknown as string}
                    onChange={onChange}
                  />
                </div>
              ) : (
                <span>{collectionCard.price}</span>
              )}
              <span className="text-sm">{currency}</span>
            </div>
          </div>
        )}
      </CardImage>
      <div className="flex items-center gap-1 p-2 pt-0 pb-1 w-full">
        <div className="flex items-center gap-1 w-full">
          {foilRenderer(collectionCard.foil)}
          {conditionRenderer(collectionCard.condition)}
          {languageRenderer(collectionCard.language, false)}
        </div>
        <div className="flex flex-col gap-2 justify-end items-end z-2">
          {owned ? (
            // @ts-ignore
            <CollectionCardInput
              inputId={`${cardKey}-amount`}
              id={id}
              field="amount"
              value={collectionCard.amount}
              onChange={onChange}
            />
          ) : (
            <>
              <div className="align-right font-bold text-center px-2 rounded-lg bg-background -mt-8 -mr-1 w-[50px]">
                {collectionCard.amount}x
              </div>
              <CollectionCardSelectionInput collectionId={collectionId} card={collectionCard} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BigCardItem;
