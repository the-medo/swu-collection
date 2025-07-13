import type { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import {
  CollectionLayout,
  useCollectionLayoutStore,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutImageBig from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageBig/CollectionLayoutImageBig.tsx';
import CollectionLayoutImageSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageSmall/CollectionLayoutImageSmall.tsx';
import CollectionLayoutTableImage from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableImage/CollectionLayoutTableImage.tsx';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import { useEffect, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  CardGroupData,
  groupCardsBy,
  sortCardsBy,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import * as React from 'react';

interface CollectionGroupsProps {
  collectionId: string;
  cards: CollectionCard[];
  depth: number;
  horizontal?: boolean;
  parentTitle?: string;
  loading?: boolean;
}

const CollectionGroups: React.FC<CollectionGroupsProps> = ({
  collectionId,
  cards,
  depth,
  horizontal = false,
  parentTitle = '',
  loading,
}) => {
  const { groupBy, sortBy, layout } = useCollectionLayoutStore();
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const [groupLoading, setGroupLoading] = useState<boolean>(true);
  const [sortLoading, setSortLoading] = useState<boolean>(depth === groupBy.length);
  const [cardData, setCardData] = useState<CollectionCard[]>([]);
  const [groupData, setGroupData] = useState<CardGroupData>();

  const groupByValue = groupBy[depth];

  useEffect(() => {
    let handle: Timer | undefined = undefined;
    if (!cardList) return;
    setGroupLoading(true);

    handle = setTimeout(() => {
      setGroupData(groupCardsBy(cardList?.cards ?? {}, cards, groupByValue));
      setGroupLoading(false);
    }, 0);

    return () => clearTimeout(handle);
  }, [cardList, groupByValue, cards]);

  useEffect(() => {
    let handle: Timer | undefined = undefined;
    if (!cardList) return;
    if (depth !== groupBy.length) return;
    setSortLoading(true);

    handle = setTimeout(() => {
      setCardData(sortCardsBy(cardList.cards, cards, sortBy));
      setSortLoading(false);
    }, 0);

    return () => clearTimeout(handle);
  }, [depth, cardList, groupBy.length, sortBy, cards]);

  const dataTransforming = groupLoading || sortLoading || loading || isFetchingCardList;

  if (depth === groupBy.length) {
    if (layout === CollectionLayout.IMAGE_BIG) {
      return (
        <CollectionLayoutImageBig
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cardData}
          horizontal={horizontal}
          dataTransforming={dataTransforming}
        />
      );
    } else if (layout === CollectionLayout.IMAGE_SMALL) {
      return (
        <CollectionLayoutImageSmall
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cardData}
          horizontal={horizontal}
          dataTransforming={dataTransforming}
        />
      );
    } else if (layout === CollectionLayout.TABLE_IMAGE) {
      return (
        <CollectionLayoutTableImage
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cardData}
          horizontal={horizontal}
          dataTransforming={dataTransforming}
        />
      );
    } else if (layout === CollectionLayout.TABLE_SMALL) {
      return (
        <CollectionLayoutTableSmall
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cardData}
          horizontal={horizontal}
          dataTransforming={dataTransforming}
        />
      );
    }
  }

  return (
    <>
      <Accordion type="multiple" className="pl-4 w-full" defaultValue={groupData?.sortedIds}>
        {groupData?.sortedIds.map(id => {
          const cards = groupData.groups[id]?.cards ?? [];
          const label = groupData.groups[id]?.label;
          const title = parentTitle !== '' ? `${parentTitle} - ${label}` : label;
          if (cards.length === 0) return null;
          return (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger>
                {title} ({cards.length})
              </AccordionTrigger>
              <AccordionContent>
                <CollectionGroups
                  key={id}
                  depth={depth + 1}
                  cards={cards}
                  horizontal={horizontal || groupData.groups[id]?.horizontal}
                  parentTitle={title}
                  collectionId={collectionId}
                  loading={dataTransforming}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
};

export default CollectionGroups;
