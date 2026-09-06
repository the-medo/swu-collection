import React from 'react';
import { useGetMatchedCardPriceVariants } from '@/api/card-prices';
import { useCardList } from '@/api/lists/useCardList.ts';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { CardPriceSourceType, cardPriceSourceInfo } from '../../../../../../../types/CardPrices.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';
import { findUnmatchedCardPriceVariants } from './findUnmatchedCardPriceVariants.ts';
import UnmatchedCardPriceTable from './UnmatchedCardPriceTable.tsx';

const supportedSources = [CardPriceSourceType.CARDMARKET, CardPriceSourceType.TCGPLAYER] as const;

const UnmatchedCardPrices: React.FC = () => {
  const [set, setSet] = React.useState<SwuSet | null>(null);
  const [sourceType, setSourceType] = React.useState<CardPriceSourceType | null>(null);
  const [searchedFilters, setSearchedFilters] = React.useState<string | null>(null);
  const cardList = useCardList();
  const matchedVariants = useGetMatchedCardPriceVariants(sourceType, set);
  const currentFilters = `${sourceType ?? ''}:${set ?? ''}`;

  const handleFind = async () => {
    const result = await matchedVariants.refetch();
    if (!result.error) setSearchedFilters(currentFilters);
  };

  const unmatched =
    searchedFilters === currentFilters && cardList.data && matchedVariants.data
      ? findUnmatchedCardPriceVariants(cardList.data.cards, matchedVariants.data, set)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unmatched price sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56">
            <SetSelect value={set} emptyOption onChange={setSet} showFullName />
          </div>
          <Select
            value={sourceType ?? undefined}
            onValueChange={value => setSourceType(value as CardPriceSourceType)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Price source" />
            </SelectTrigger>
            <SelectContent>
              {supportedSources.map(source => (
                <SelectItem key={source} value={source}>
                  {cardPriceSourceInfo[source].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleFind}
            disabled={!sourceType || matchedVariants.isFetching || cardList.isLoading}
          >
            {matchedVariants.isFetching ? 'Finding...' : 'Find cards without price source'}
          </Button>
        </div>

        {matchedVariants.error && (
          <p className="text-sm text-destructive">{matchedVariants.error.message}</p>
        )}

        {unmatched && unmatched.length === 0 && (
          <p className="rounded-md border p-4 text-sm">Every matching card variant has a source.</p>
        )}
        {unmatched && unmatched.length > 0 && (
          <UnmatchedCardPriceTable key={`${currentFilters}:${unmatched.length}`} rows={unmatched} />
        )}
      </CardContent>
    </Card>
  );
};

export default UnmatchedCardPrices;
