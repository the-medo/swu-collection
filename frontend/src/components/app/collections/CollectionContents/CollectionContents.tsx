import { useGetCollectionCards } from '@/api/useGetCollectionCards.ts';
import { useCardList } from '@/api/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import CollectionLayoutSettings from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/CollectionLayoutSettings.tsx';

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
      <CollectionLayoutSettings />
      <div className="flex gap-4 flex-wrap">
        {cards.map(c => {
          const card = cardList?.cards[c.cardId];
          // const variant = card?.variants[c.variantId];

          return (
            <div className="max-w-[200px]" key={`${c.variantId}-${c.foil}`}>
              <CardImage card={card} cardVariantId={c.variantId} size="w200" foil={c.foil} />
            </div>
          );
        })}
      </div>
      {JSON.stringify(data)}
    </div>
  );
};

export default CollectionContents;
