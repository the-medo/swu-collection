import React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { ParsedCardData } from '../lib/parseCardmarketHtml';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';

interface CardImageCellProps {
  card: ParsedCardData;
  variantId?: string;
}

const CardImageCell: React.FC<CardImageCellProps> = ({ card, variantId }) => {
  const { data: cardList } = useCardList();
  const navigate = useNavigate({ from: Route.fullPath });

  const handleViewCard = () => {
    navigate({
      search: prev => ({ ...prev, modalCardId: card.cardId }),
    });
  };

  if (!card.cardId || !variantId) {
    return (
      <div className="flex items-center justify-center h-[70px] w-[50px] bg-secondary rounded-lg text-xs text-center">
        No image
      </div>
    );
  }

  const cardData = cardList?.cards?.[card.cardId];

  if (!cardData) {
    return (
      <div className="flex items-center justify-center h-[70px] w-[50px] bg-secondary rounded-lg text-xs text-center">
        Card not found
      </div>
    );
  }

  return (
    <div onClick={handleViewCard} className="cursor-pointer">
      <CardImage card={cardData} cardVariantId={variantId} size="w100" />
    </div>
  );
};

export default CardImageCell;
