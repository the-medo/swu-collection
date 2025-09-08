import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import CardVariantDialogSelectorContent from './CardVariantDialogSelectorContent.tsx';
import { cn } from '@/lib/utils.ts';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';
import Dialog from '@/components/app/global/Dialog.tsx';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';

interface CardVariantDialogSelectorProps {
  cardId: string;
  variantId?: string;
  card?: CardDataWithVariants<CardListVariants>;
  setVariantOverride: (value: string) => void; // not used directly here, saveVariantOverride will be passed
  saveVariantOverride: (cardId: string, variantId: string | undefined) => void;
  isOverride?: boolean;
}

const CardVariantDialogSelector: React.FC<CardVariantDialogSelectorProps> = ({
  cardId,
  variantId,
  card,
  saveVariantOverride,
  isOverride,
}) => {
  const variants = useMemo(() => Object.keys(card?.variants || {}), [card]);

  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <div
          className={cn('border-4 border-transparent rounded-lg p-0 m-0', {
            'border-red-500 bg-green-950/30': isOverride,
          })}
        >
          <CardImage card={card} cardVariantId={variantId} size="w100">
            {isOverride && (
              <div className="absolute bottom-0 w-full flex justify-center items-center bg-black bg-opacity-50 p-1">
                <Badge variant="destructive">Override</Badge>
              </div>
            )}
          </CardImage>
        </div>
      }
      headerHidden={false}
      footer={
        <div className="flex gap-2 justify-end w-full">
          {isOverride && (
            <Button
              onClick={e => {
                e.preventDefault();
                saveVariantOverride(cardId, undefined);
                setOpen(false);
              }}
            >
              Reset to default
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      }
      size="large"
    >
      <CardVariantDialogSelectorContent
        cardId={cardId}
        card={card}
        variants={variants}
        saveVariantOverride={saveVariantOverride}
        currentVariantId={variantId}
        isOverride={isOverride}
        onDone={() => setOpen(false)}
      />
    </Dialog>
  );
};

export default CardVariantDialogSelector;
