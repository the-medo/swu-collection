import React, { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useCardPoolDeckDetailStore } from '../useCardPoolDeckDetailStore.ts';

export interface CardPreviewProps {
  className?: string;
}

const CardPreview: React.FC<CardPreviewProps> = ({ className }) => {
  const { hoveredCardId } = useCardPoolDeckDetailStore();
  const { data: cardListData } = useCardList();

  const { card, variantId } = useMemo(() => {
    const card = hoveredCardId ? cardListData?.cards[hoveredCardId] : undefined;
    const variantId = card ? selectDefaultVariant(card) : undefined;
    return { card, variantId };
  }, [hoveredCardId, cardListData?.cards]);

  return (
    <div className={`mb-3 flex justify-center ${className ?? ''}`}>
      <CardImage card={card} cardVariantId={variantId} size="w300" />
    </div>
  );
};

export default CardPreview;
