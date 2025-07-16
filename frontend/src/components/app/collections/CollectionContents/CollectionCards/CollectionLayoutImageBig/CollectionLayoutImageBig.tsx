import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import CollectionCardInput from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';
import {
  useCCDetail,
  useCCCard,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';

interface CollectionLayoutImageBigProps {
  collectionId: string;
  cardKeys: string[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutImageBig: React.FC<CollectionLayoutImageBigProps> = ({
  collectionId,
  cardKeys,
  horizontal = false,
  dataTransforming,
}) => {
  const { isFetching: isFetchingCardList } = useCardList();
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);

  const loading = isFetchingCardList || dataTransforming;

  return (
    <div className="flex gap-4 flex-wrap">
      {cardKeys.map(cardKey => {
        if (loading) {
          return (
            <Skeleton
              key={cardKey}
              className={cn(
                cardImageVariants({
                  size: 'w200',
                  horizontal: horizontal,
                }),
                'rounded-lg',
              )}
            />
          );
        }

        const collectionCard = useCCDetail(cardKey);
        const card = useCCCard(cardKey);

        if (!card) {
          return (
            <Skeleton
              key={cardKey}
              className={cn(
                cardImageVariants({
                  size: 'w200',
                  horizontal: horizontal,
                }),
                'rounded-lg',
              )}
            />
          );
        }

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
                <div className="absolute bottom-0 right-0 w-fit min-w-20 flex grow-0 items-center gap-1 bg-secondary bg-opacity-80 py-2 px-2 mr-0 mb-0">
                  <div className="flex gap-2 items-center w-full justify-end">
                    {owned ? (
                      //@ts-ignore
                      <CollectionCardInput
                        inputId={getCollectionCardIdentificationKey(id)}
                        id={id}
                        field="price"
                        value={collectionCard.price}
                        onChange={onChange}
                      />
                    ) : (
                      <span>{collectionCard.price}</span>
                    )}
                    <span>{currency}</span>
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
              <div>
                {owned ? (
                  // @ts-ignore
                  <CollectionCardInput
                    inputId={getCollectionCardIdentificationKey(id)}
                    id={id}
                    field="amount"
                    value={collectionCard.amount}
                    onChange={onChange}
                  />
                ) : (
                  <div className="font-bold text-center px-2 rounded-lg bg-background">
                    {collectionCard.amount}x
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CollectionLayoutImageBig;
