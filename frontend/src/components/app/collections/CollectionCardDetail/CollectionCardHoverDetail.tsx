import type { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import { PropsWithChildren } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { Label } from '@/components/ui/label.tsx';
import CollectionCardInput from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';

interface CollectionCardDetailProps extends PropsWithChildren {
  cardData?: CardDataWithVariants<CardListVariants>;
  collectionId: string;
  collectionCard: CollectionCard;
}

const CollectionCardHoverDetail: React.FC<CollectionCardDetailProps> = ({
  cardData,
  collectionId,
  collectionCard,
  children,
}) => {
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);

  const id = getIdentificationFromCollectionCard(collectionCard);

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger>{children}</HoverCardTrigger>
      <HoverCardContent side="right" className=" w-fit">
        <div className="flex gap-1 p-2 pt-0 pb-1 w-full">
          <CardImage
            card={cardData}
            cardVariantId={collectionCard?.variantId}
            size={cardData?.front?.horizontal ? 'h350' : 'w200'}
            foil={collectionCard?.foil}
            forceHorizontal={cardData?.front?.horizontal}
          />
          <div className="flex flex-col gap-2 p-2">
            <div className="flex gap-1 items-center w-full">
              <Label className="w-20">Language</Label>
              {languageRenderer(collectionCard.language)}
            </div>
            <div className="flex gap-1 items-center w-full">
              <Label className="w-20">Condition</Label>
              {conditionRenderer(collectionCard.condition)}
            </div>
            {collectionCard.foil && (
              <div className="flex gap-1 items-center w-full">
                <Label className="w-20">Foil</Label>
                {foilRenderer(collectionCard.foil)}
              </div>
            )}
            <div className="flex gap-1 items-center w-full">
              <Label className="w-20">Quantity</Label>
              <div>
                {owned ? (
                  // @ts-ignore
                  <CollectionCardInput
                    id={id}
                    field="amount"
                    value={collectionCard.amount}
                    onChange={onChange}
                  />
                ) : (
                  <div className="font-bold">{collectionCard.amount}x</div>
                )}
              </div>
            </div>
            {(collectionCard.price || owned) && (
              <div className="flex gap-1 items-center w-full">
                <Label className="w-20">Price</Label>
                <div>
                  {owned ? (
                    //@ts-ignore
                    <CollectionCardInput
                      key={getCollectionCardIdentificationKey(id)}
                      id={id}
                      field="price"
                      value={collectionCard.price}
                      onChange={onChange}
                    />
                  ) : (
                    <span>
                      {collectionCard.price} {currency}
                    </span>
                  )}
                </div>
              </div>
            )}
            {(collectionCard.note || owned) && (
              <div className="flex gap-1 items-center w-full">
                <Label className="w-20">Note</Label>
                <div>
                  {owned ? (
                    //@ts-ignore
                    <CollectionCardInput
                      key={getCollectionCardIdentificationKey(id)}
                      id={id}
                      field="note"
                      value={collectionCard.note}
                      onChange={onChange}
                    />
                  ) : (
                    <div className="text-gray-500 text-sm max-w-40">{collectionCard.note}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default CollectionCardHoverDetail;
