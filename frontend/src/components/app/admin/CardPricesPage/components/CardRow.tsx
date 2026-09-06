import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table.tsx';
import { ParsedCardData } from '../lib/parseCardmarketHtml';
import CardImageCell from './CardImageCell';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useCreateCardPriceSource } from '@/api/card-prices/useCreateCardPriceSource';
import { CardPriceSourceType } from '../../../../../../../types/CardPrices.ts';

interface CardRowProps {
  card: ParsedCardData;
  sourceType: CardPriceSourceType;
  isSubmitted: boolean;
  isBatchSubmitting: boolean;
  onSubmitted: () => void;
}

const CardRow: React.FC<CardRowProps> = ({
  card,
  sourceType,
  isSubmitted,
  isBatchSubmitting,
  onSubmitted,
}) => {
  const [variantId, setVariantId] = useState(card.variantId || '');
  const [cardId, setCardId] = useState(card.cardId || '');
  const [isEditingCardId, setIsEditingCardId] = useState(false);
  const createMutation = useCreateCardPriceSource();

  const handleSubmit = async () => {
    if (!cardId || !variantId) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        cardId,
        variantId,
        sourceType,
        sourceLink: card.link,
        sourceProductId: card.productId,
      });

      onSubmitted();
    } catch (error) {
      console.error('Failed to create pricing source:', error);
    }
  };

  return (
    <TableRow
      key={`${card.productId}-${card.cardId}`}
      className={isSubmitted ? 'bg-gray-100 opacity-80' : ''}
    >
      <TableCell className="w-[150px]">
        <CardImageCell card={card} variantId={variantId} />
      </TableCell>
      <TableCell className="space-y-1 w-[150px]">
        <div>{card.nameDirty}</div>
        <div className="text-sm text-muted-foreground">{card.cardNumber}</div>
      </TableCell>
      <TableCell className="space-y-1">
        <Input value={card.productId} disabled className="w-full" />
        <Input
          value={cardId}
          onChange={e => setCardId(e.target.value)}
          onDoubleClick={() => {
            if (!isSubmitted) setIsEditingCardId(true);
          }}
          // Keep blur if you want to exit edit mode automatically
          // onBlur={() => setIsEditingCardId(false)}
          readOnly={!isEditingCardId}
          disabled={isSubmitted || isBatchSubmitting}
          className="w-full"
        />
        <Input
          value={variantId}
          onChange={e => setVariantId(e.target.value)}
          className="w-full"
          disabled={isSubmitted || isBatchSubmitting}
        />
      </TableCell>
      <TableCell className="w-[150px] truncate">
        <a
          href={card.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-wrap"
        >
          {card.link}
        </a>
      </TableCell>
      <TableCell className=" w-[100px]">
        <Button
          variant="outline"
          onClick={handleSubmit}
          disabled={
            isSubmitted || isBatchSubmitting || createMutation.isPending || !cardId || !variantId
          }
        >
          {createMutation.isPending ? 'Submitting...' : isSubmitted ? 'Submitted' : 'Submit'}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default CardRow;
