import type { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import {
  CollectionLayout,
  useCollectionLayoutStore,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutImageBig from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageBig/CollectionLayoutImageBig.tsx';
import CollectionLayoutImageSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageSmall/CollectionLayoutImageSmall.tsx';
import CollectionLayoutTableImage from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableImage/CollectionLayoutTableImage.tsx';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import { useMemo } from 'react';
import { useCardList } from '@/api/useCardList.ts';
import {
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
}

const CollectionGroups: React.FC<CollectionGroupsProps> = ({
  collectionId,
  cards,
  depth,
  horizontal = false,
  parentTitle = '',
}) => {
  const { groupBy, sortBy, layout } = useCollectionLayoutStore();
  const { data: cardList } = useCardList();

  const groupByValue = groupBy[depth];

  const cardGroupData = useMemo(() => {
    return groupCardsBy(cardList?.cards ?? {}, cards, groupByValue);
  }, [groupByValue, cards]);

  if (depth === groupBy.length) {
    if (cardList) sortCardsBy(cardList.cards, cards, sortBy);

    if (layout === CollectionLayout.IMAGE_BIG) {
      return (
        <CollectionLayoutImageBig
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cards}
          horizontal={horizontal}
        />
      );
    } else if (layout === CollectionLayout.IMAGE_SMALL) {
      return (
        <CollectionLayoutImageSmall
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cards}
          horizontal={horizontal}
        />
      );
    } else if (layout === CollectionLayout.TABLE_IMAGE) {
      return (
        <CollectionLayoutTableImage
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cards}
          horizontal={horizontal}
        />
      );
    } else if (layout === CollectionLayout.TABLE_SMALL) {
      return (
        <CollectionLayoutTableSmall
          key={sortBy.join('-')}
          collectionId={collectionId}
          cards={cards}
          horizontal={horizontal}
        />
      );
    }
  }

  return (
    <>
      <Accordion type="multiple" className="pl-4" defaultValue={cardGroupData?.sortedIds}>
        {cardGroupData?.sortedIds.map(id => {
          const cards = cardGroupData.groups[id]?.cards ?? [];
          const label = cardGroupData.groups[id]?.label;
          const title = parentTitle !== '' ? `${parentTitle} - ${label}` : label;
          if (cards.length === 0) return null;
          return (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger>
                {title} ({cards.length})
              </AccordionTrigger>
              <AccordionContent>
                <CollectionGroups
                  depth={depth + 1}
                  cards={cards}
                  horizontal={horizontal || cardGroupData.groups[id]?.horizontal}
                  parentTitle={title}
                  collectionId={collectionId}
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
