import { useCardList } from '@/api/useCardList.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import CollectionCardInput from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { getCollectionCardIdentificationKey } from '@/api/usePutCollectionCard.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';

interface CollectionLayoutImageBigProps {
  collectionId: string;
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutImageBig: React.FC<CollectionLayoutImageBigProps> = ({
  collectionId,
  cards,
  horizontal = false,
}) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);

  const loading = isFetchingCardList;

  return (
    <div className="flex gap-4 flex-wrap">
      {cards.map(c => {
        const card = cardList?.cards[c.cardId];

        if (loading || !card) {
          return (
            <Skeleton
              key={c.variantId}
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

        const id = getIdentificationFromCollectionCard(c);

        return (
          <div className="max-w-[200px] flex flex-col gap-1" key={`${c.variantId}-${c.foil}`}>
            <CardImage
              card={card}
              cardVariantId={c.variantId}
              size="w200"
              foil={c.foil}
              forceHorizontal={horizontal}
            />
            <div className="flex items-center gap-1 w-full">
              <div>
                {owned ? (
                  // @ts-ignore
                  <CollectionCardInput
                    key={getCollectionCardIdentificationKey(id)}
                    id={id}
                    field="amount"
                    value={c.amount}
                    onChange={onChange}
                  />
                ) : (
                  <div className="font-medium text-right w-8">{c.amount}</div>
                )}
              </div>
              {foilRenderer(c.foil)}
              {conditionRenderer(c.condition)}
              {languageRenderer(c.language, false)}
            </div>
            <div className="flex gap-2 items-center w-full justify-end">
              {owned ? (
                //@ts-ignore
                <CollectionCardInput
                  key={getCollectionCardIdentificationKey(id)}
                  id={id}
                  field="price"
                  value={c.price}
                  onChange={onChange}
                />
              ) : (
                <span>{c.price}</span>
              )}
              <span>{c.price ? currency : '-'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CollectionLayoutImageBig;
