import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';
import { Badge } from '@/components/ui/badge.tsx';

interface CardVariantDialogSelectorContentProps {
  card?: CardDataWithVariants<CardListVariants>;
  variants: string[];
  saveVariantOverride: (cardId: string, variantId: string | undefined) => void;
  cardId: string;
  currentVariantId?: string;
  isOverride?: boolean;
  onDone?: () => void;
}

const CardVariantDialogSelectorContent: React.FC<CardVariantDialogSelectorContentProps> = ({
  card,
  variants,
  saveVariantOverride,
  cardId,
  currentVariantId,
  isOverride,
  onDone,
}) => {
  return (
    <>
      <div className="flex flex-col gap-2 p-2 items-center justify-center">
        <h4>Select a variant you want to use in your deck images:</h4>
        <div className="flex flex-wrap gap-2 p-2 items-center justify-center">
          {variants.map(variantId => (
            <button
              key={variantId}
              className={
                'p-0 m-0 border-[5px] rounded-md ' +
                (isOverride && variantId === currentVariantId
                  ? 'border-red-500'
                  : 'border-transparent')
              }
              onClick={e => {
                e.preventDefault();
                saveVariantOverride(cardId, variantId);
                onDone?.();
              }}
            >
              <CardImage card={card} cardVariantId={variantId} size="w200">
                {isOverride && variantId === currentVariantId && (
                  <div className="absolute bottom-0 w-full flex justify-center items-center bg-black bg-opacity-50 p-1">
                    <Badge variant="destructive">Override</Badge>
                  </div>
                )}
              </CardImage>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CardVariantDialogSelectorContent;
