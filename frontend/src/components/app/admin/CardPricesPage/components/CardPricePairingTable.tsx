import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import CardRow from './CardRow';
import { ParsedCardData } from '../lib/parseCardmarketHtml';
import { CardPriceSourceType } from '../../../../../../../types/CardPrices.ts';
import { Button } from '@/components/ui/button.tsx';
import { useCreateCardPriceSource } from '@/api/card-prices/useCreateCardPriceSource.ts';

type CardPricePairingTableProps = {
  parsedData: ParsedCardData[];
  sourceType: CardPriceSourceType;
  onBatchSubmittingChange?: (isSubmitting: boolean) => void;
};

const getRowKey = (card: ParsedCardData) =>
  `${card.productId}:${card.cardId ?? ''}:${card.variantId ?? ''}`;

const delay = (milliseconds: number) =>
  new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

const CardPricePairingTableContent: React.FC<CardPricePairingTableProps> = ({
  parsedData,
  sourceType,
  onBatchSubmittingChange,
}) => {
  const createMutation = useCreateCardPriceSource();
  const [submittedRowKeys, setSubmittedRowKeys] = React.useState<Set<string>>(new Set());
  const [isBatchSubmitting, setIsBatchSubmitting] = React.useState(false);
  const [processedCount, setProcessedCount] = React.useState(0);
  const [batchTotal, setBatchTotal] = React.useState(0);
  const [batchResult, setBatchResult] = React.useState<{
    submitted: number;
    failed: number;
  } | null>(null);

  const exactlyMatchedCards = parsedData.filter(card => card.cardId && card.variantId);
  const pendingCards = exactlyMatchedCards.filter(card => !submittedRowKeys.has(getRowKey(card)));

  const markSubmitted = (card: ParsedCardData) => {
    setSubmittedRowKeys(previous => new Set(previous).add(getRowKey(card)));
  };

  const handleSubmitAllMatched = async () => {
    if (pendingCards.length === 0 || isBatchSubmitting) return;

    const cardsToSubmit = [...pendingCards];
    let submitted = 0;
    let failed = 0;

    setIsBatchSubmitting(true);
    onBatchSubmittingChange?.(true);
    setProcessedCount(0);
    setBatchTotal(cardsToSubmit.length);
    setBatchResult(null);

    try {
      for (const [index, card] of cardsToSubmit.entries()) {
        try {
          await createMutation.mutateAsync({
            cardId: card.cardId!,
            variantId: card.variantId!,
            sourceType,
            sourceLink: card.link,
            sourceProductId: card.productId,
          });
          submitted += 1;
          markSubmitted(card);
        } catch (error) {
          failed += 1;
          console.error(`Failed to submit pricing source for product ${card.productId}:`, error);
        }

        setProcessedCount(index + 1);
        if (index < cardsToSubmit.length - 1) await delay(100);
      }

      setBatchResult({ submitted, failed });
    } finally {
      setIsBatchSubmitting(false);
      onBatchSubmittingChange?.(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-2">Parsed Data ({parsedData.length} cards)</h3>
      <div className="border rounded-md overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Submit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedData.map(card => (
              <CardRow
                key={getRowKey(card)}
                card={card}
                sourceType={sourceType}
                isSubmitted={submittedRowKeys.has(getRowKey(card))}
                isBatchSubmitting={isBatchSubmitting}
                onSubmitted={() => markSubmitted(card)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <div>
          <p className="font-medium">Exactly matched {exactlyMatchedCards.length} card numbers</p>
          {isBatchSubmitting && (
            <p className="text-sm text-muted-foreground">
              Submitting {processedCount} / {batchTotal}
            </p>
          )}
          {!isBatchSubmitting && batchResult && (
            <p className="text-sm text-muted-foreground">
              {batchResult.submitted} submitted, {batchResult.failed} failed
            </p>
          )}
        </div>
        <Button
          onClick={handleSubmitAllMatched}
          disabled={isBatchSubmitting || pendingCards.length === 0}
        >
          {isBatchSubmitting
            ? 'Submitting...'
            : pendingCards.length === 0
              ? 'All matched submitted'
              : `Submit all matched (${pendingCards.length})`}
        </Button>
      </div>
    </div>
  );
};

const CardPricePairingTable: React.FC<CardPricePairingTableProps> = props => {
  if (!props.parsedData || props.parsedData.length === 0) return null;

  const parsedDataKey = props.parsedData.map(getRowKey).join('|');
  return <CardPricePairingTableContent key={parsedDataKey} {...props} />;
};

export default CardPricePairingTable;
