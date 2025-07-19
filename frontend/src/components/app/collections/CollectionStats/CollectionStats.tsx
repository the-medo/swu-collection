import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import * as React from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import { cn } from '@/lib/utils.ts';
import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionStatsProps {
  collectionId: string;
}

const CollectionStats: React.FC<CollectionStatsProps> = ({ collectionId }) => {
  const { data, isFetching } = useGetCollection(collectionId);
  const { data: collectionCards, isFetching: isFetchingCollectionCards } =
    useGetCollectionCards(collectionId);
  const { data: cardList } = useCardList();
  const collectionCurrency = data?.user.currency;
  const loading = isFetching || isFetchingCollectionCards;
  const { cardListString } = useCollectionInfo(collectionId);

  const stats = useMemo(() => {
    let totalPrice = 0;
    let totalCount = 0;
    let countByRarity: Record<string, number> = {};
    let countBySet: Record<string, number> = {};

    (collectionCards?.data ?? []).forEach(c => {
      totalPrice += (c.price ?? 0) * c.amount;
      totalCount += c.amount ?? 0;
      const card = cardList?.cards?.[c.cardId];
      const cardVariant = card?.variants[c.variantId];
      if (card && cardVariant) {
        const s = cardVariant.set;
        countBySet[s] = (countBySet[s] ?? 0) + c.amount;
        countByRarity[card.rarity] = (countByRarity[card.rarity] ?? 0) + c.amount;
      }
    });

    return {
      totalPrice,
      totalCount,
      countByRarity,
      countBySet,
    };
  }, [cardList, collectionCards]);

  return (
    <Card className={cn({ 'opacity-50': loading })}>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>{cardListString} stats</span>{' '}
          <div className="flex flex-col gap-0">
            <span className="font-normal text-sm text-gray-500">
              {stats.totalCount} total cards
            </span>
            <span className="text-sm text-gray-500">
              {stats.totalPrice} {collectionCurrency}
            </span>
          </div>
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <div className="flex gap-4">
            {Object.keys(stats.countByRarity).map(r => (
              <div className="flex gap-2 items-center" key={r}>
                <RarityIcon rarity={r} size="xSmall" />
                <span className="text-sm">{stats.countByRarity[r]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            {Object.keys(stats.countBySet).map(s => (
              <div className="flex gap-2 items-center" key={s}>
                <span className="text-sm font-medium">{s.toUpperCase()}:</span>
                <span className="text-sm">{stats.countBySet[s]}</span>
              </div>
            ))}
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default CollectionStats;
