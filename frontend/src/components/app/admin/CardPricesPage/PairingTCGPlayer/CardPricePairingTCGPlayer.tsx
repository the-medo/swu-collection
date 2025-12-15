import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import GroupRefreshButton from './GroupRefreshButton.tsx';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';
import { parseTCGPlayerData } from '../lib/parseTCGPlayerData.ts';
import { ParsedCardData } from '../lib/parseCardmarketHtml.ts';
import CardPricePairingTable from '../components/CardPricePairingTable.tsx';
import TCGPlayerGroupSelect from '@/components/app/admin/CardPricesPage/PairingTCGPlayer/TCGPlayerGroupSelect.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { CardPriceSourceType } from '../../../../../../../types/CardPrices.ts';

const CardPricePairingTCGPlayer: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
  const [selectedSet, setSelectedSet] = React.useState<SwuSet | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedCardData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preferredVariantName, setPreferredVariantName] = React.useState<string>('');
  const [preferredVariantNameExact, setPreferredVariantNameExact] = React.useState<boolean>(false);

  const { data: cardList } = useCardList();

  const handleClear = () => {
    setSelectedGroupId(null);
    setSelectedSet(null);
    setParsedData([]);
    setError(null);
    setPreferredVariantName('');
    setPreferredVariantNameExact(false);
  };

  const handleParse = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!selectedGroupId) {
        setError('Please select a TCGplayer group first');
        return;
      }
      const results = await parseTCGPlayerData(
        selectedGroupId,
        selectedSet,
        cardList?.cards,
        preferredVariantName.toLowerCase().trim() || undefined,
        preferredVariantNameExact,
      );
      if (results.length === 0) {
        setError('No card data found for the selected group.');
      }
      setParsedData(results);
    } catch (e) {
      setError(`Error fetching/parsing data: ${e instanceof Error ? e.message : String(e)}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>TCGplayer pairing</CardTitle>
          <GroupRefreshButton />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="w-56">
              <TCGPlayerGroupSelect
                value={selectedGroupId}
                emptyOption={true}
                onChange={setSelectedGroupId}
                showFullName={true}
              />
            </div>
            <div className="w-40">
              <SetSelect
                value={selectedSet}
                emptyOption={true}
                onChange={setSelectedSet}
                showFullName={true}
              />
            </div>
            <div className="w-56">
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                placeholder="Preferred variant name (optional)"
                value={preferredVariantName}
                onChange={e => setPreferredVariantName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={preferredVariantNameExact}
                onCheckedChange={v => v !== 'indeterminate' && setPreferredVariantNameExact(!!v)}
                id="preferredVariantNameExact"
              />
              <label htmlFor="preferredVariantNameExact" className="text-sm select-none">
                Exact
              </label>
            </div>
            <Button onClick={handleParse} disabled={isLoading}>
              {isLoading ? 'Parsing...' : 'Parse'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isLoading || (!selectedGroupId && !selectedSet && parsedData.length === 0)}
            >
              Clear
            </Button>
            {parsedData.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  const dataStr = JSON.stringify(parsedData, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'tcgplayer-data.json';
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download JSON
              </Button>
            )}
          </div>

          {error && <div className="text-red-500 mt-2">{error}</div>}

          <CardPricePairingTable
            parsedData={parsedData}
            sourceType={CardPriceSourceType.TCGPLAYER}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CardPricePairingTCGPlayer;
