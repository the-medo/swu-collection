import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { parseCardmarketHtml, ParsedCardData } from './lib/parseCardmarketHtml';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import SetSelect from '@/components/app/global/SetSelect';
import { useCardList } from '@/api/lists/useCardList.ts';
import { SwuSet } from '../../../../../../types/enums.ts';
import CardRow from './components/CardRow';

const CardPricesPage: React.FC = () => {
  const [bulkText, setBulkText] = React.useState('');
  const [parsedData, setParsedData] = React.useState<ParsedCardData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSet, setSelectedSet] = React.useState<SwuSet | null>(null);

  const { data: cardList } = useCardList();

  const handleClear = () => {
    setBulkText('');
    setParsedData([]);
    setError(null);
    setSelectedSet(null);
  };

  const handleParse = () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!bulkText.trim()) {
        setError('Please paste HTML content first');
        return;
      }
      if (!selectedSet) {
        setError('Please select a set');
        return;
      }

      const results = parseCardmarketHtml(bulkText, selectedSet, cardList?.cards);

      if (results.length === 0) {
        setError('No card data found. Please check the HTML content.');
      } else {
        setParsedData(results);
        console.log(`Successfully parsed ${results.length} cards`);
      }
    } catch (err) {
      setError(`Error parsing data: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Parsing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cardmarket bulk parser</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste Cardmarket data here..."
              className="min-h-[200px]"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <div className="w-40">
                <SetSelect
                  value={selectedSet}
                  emptyOption={true}
                  onChange={setSelectedSet}
                  showFullName={true}
                />
              </div>
              <Button onClick={handleParse} disabled={isLoading}>
                {isLoading ? 'Parsing...' : 'Parse'}
              </Button>

              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isLoading || (!bulkText && parsedData.length === 0)}
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
                    link.download = 'cardmarket-data.json';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download JSON
                </Button>
              )}
            </div>

            {error && <div className="text-red-500 mt-2">{error}</div>}

            {parsedData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">
                  Parsed Data ({parsedData.length} cards)
                </h3>
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
                        <CardRow key={card.productId} card={card} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { CardPricesPage };
