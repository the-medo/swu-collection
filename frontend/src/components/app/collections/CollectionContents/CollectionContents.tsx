import { useGetCollectionCards } from '@/api/useGetCollectionCards.ts';
import { useCardList } from '@/api/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';

interface CollectionContentsProps {
  collectionId: string;
}

const CollectionContents: React.FC<CollectionContentsProps> = ({ collectionId }) => {
  const { data, isFetching } = useGetCollectionCards(collectionId);
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  const loading = isFetching || isFetchingCardList;

  const cards = data?.data ?? [];

  return (
    <div className="flex flex-col gap-2">
      {loading}
      {JSON.stringify(data)}
      <div className="flex gap-4">
        {cards.map(c => {
          const card = cardList?.cards[c.cardId];
          // const variant = card?.variants[c.variantId];

          return (
            <div className="max-w-[200px]">
              <CardImage card={card} cardVariantId={c.variantId} size="w200" foil={c.foil} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollectionContents;
