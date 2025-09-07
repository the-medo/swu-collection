import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';
import { Button } from '@/components/ui/button.tsx';

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
        <div className="flex flex-wrap gap-2 p-2 items-center justify-center">
          {variants.map(variantId => (
            <button
              key={variantId}
              className={
                'p-0 m-0 border-[5px] rounded-md ' +
                (isOverride && variantId === currentVariantId
                  ? 'border-green-500'
                  : 'border-transparent')
              }
              onClick={e => {
                e.preventDefault();
                saveVariantOverride(cardId, variantId);
                onDone?.();
              }}
            >
              <CardImage card={card} cardVariantId={variantId} size="w200" />
            </button>
          ))}
        </div>
        {/* Option to reset override */}
        {isOverride && (
          <Button
            onClick={e => {
              e.preventDefault();
              saveVariantOverride(cardId, undefined);
              onDone?.();
            }}
          >
            Reset to default
          </Button>
        )}
      </div>
    </>
  );
};

export default CardVariantDialogSelectorContent;
