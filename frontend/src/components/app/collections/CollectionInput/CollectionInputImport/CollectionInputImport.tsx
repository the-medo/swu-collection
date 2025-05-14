import { useCallback, useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { setInfo } from '../../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../../types/enums.ts';

interface CollectionInputImportProps {
  collectionId: string | undefined;
}

interface ImportedCard {
  set: string;
  cardNumber: number;
  count: number;
  isFoil: boolean;
}

interface MatchedCard extends ImportedCard {
  cardId: string;
  cardName: string;
  variantId: string;
  variantName: string;
}

const CollectionInputImport: React.FC<CollectionInputImportProps> = () => {
  const { data: cardListData } = useCardList();
  const { toast } = useToast();
  const [csvContent, setCsvContent] = useState<string>('');
  const [matchedCards, setMatchedCards] = useState<MatchedCard[]>([]);
  const [unmatchedCards, setUnmatchedCards] = useState<ImportedCard[]>([]);
  const [showMatched, setShowMatched] = useState<boolean>(false);
  const [showUnmatched, setShowUnmatched] = useState<boolean>(true);

  const handleCsvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvContent(e.target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setCsvContent(content);
      toast({
        title: 'File loaded',
        description: `${file.name} has been loaded successfully.`,
      });
    };
    reader.onerror = () => {
      toast({
        title: 'Error reading file',
        description: 'Failed to read the file content.',
        variant: 'destructive',
      });
    };
    reader.readAsText(file);
  };

  const formatUnmatchedCardsToCSV = (): string => {
    return unmatchedCards
      .map(card => `${card.set},${card.cardNumber},${card.count},${card.isFoil}`)
      .join('\n');
  };

  const processCSV = useCallback(() => {
    if (!cardListData) return;
    const lines = csvContent.trim().split('\n');

    // Check if the first line is a header and skip it if it is
    let startIndex = 0;
    if (
      lines[0].toLowerCase().includes('set') &&
      lines[0].toLowerCase().includes('cardnumber') &&
      lines[0].toLowerCase().includes('count') &&
      lines[0].toLowerCase().includes('isfoil')
    ) {
      startIndex = 1;
    }

    const importedCards: ImportedCard[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 4) continue;

      importedCards.push({
        set: parts[0].trim(),
        cardNumber: parseInt(parts[1].trim(), 10),
        count: parseInt(parts[2].trim(), 10) || 1,
        isFoil: parts[3].trim().toLowerCase() === 'true',
      });
    }

    const matched: MatchedCard[] = [];
    const unmatched: ImportedCard[] = [];

    const foilVariantNames: Record<string, string | undefined> = {
      Standard: 'Standard Foil',
      Hyperspace: 'Hyperspace Foil',
      'Standard Prestige': 'Foil Prestige',
    };

    importedCards.forEach(card => {
      const set = card.set.toLowerCase() as SwuSet;

      if (!(set in cardListData.cardsByCardNo)) {
        unmatched.push(card);
        return;
      }

      const c = cardListData.cardsByCardNo[set]?.[card.cardNumber];
      console.log({ c });

      const cardData = c ? cardListData.cards[c.cardId] : undefined;

      if (!c || !cardData) {
        unmatched.push(card);
        return;
      }

      const match: MatchedCard = {
        ...card,
        cardId: c.cardId,
        cardName: cardData.name,
        variantId: c.variant.variantId,
        variantName: c.variant.variantName,
      };

      /**
       * special case for numbering of sets for JTL+
       * - foils, HS and HSF have all their own numbers
       * - swudb exports standard foils and HSF with the same number as the nonfoil version of the card
       */
      if (setInfo[set]?.sortValue >= setInfo[SwuSet.JTL].sortValue) {
        if (card.isFoil) {
          const newVariantName = foilVariantNames[c.variant.variantName]!;
          if (newVariantName !== undefined) {
            const newVariantId = Object.keys(cardData.variants).find(v => {
              return cardData.variants[v]?.variantName === newVariantName;
            });
            if (newVariantId) {
              match.variantId = newVariantId;
              match.variantName = cardData.variants[newVariantId]!.variantName;
              match.cardNumber = cardData.variants[newVariantId]!.cardNo;
            }
          }
        }
      }

      matched.push(match);
    });

    setMatchedCards(matched);
    setUnmatchedCards(unmatched);
  }, [cardListData, csvContent]);

  return (
    <div>
      <Alert variant="info" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Note</AlertTitle>
        <AlertDescription>
          Pairing of promo cards and cards from special sets is not supported very well due to
          mismatch in data. Sorry for the inconvenience.
        </AlertDescription>
      </Alert>

      <Dialog>
        <DialogTrigger asChild>
          <Button>Import from SWUDB</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Collection from SWUDB</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm">
              <h4>
                1. Download CSV of the collection in SWUDB (on the bottom of "Bulk Actions" in
                collection)
              </h4>
              <h4>
                2. Paste your CSV data below. The format should be:{' '}
                <code>SET,CARDNUMBER,COUNT,ISFOIL</code>
              </h4>
              <Textarea
                placeholder="Paste CSV data here..."
                value={csvContent}
                onChange={handleCsvChange}
                className="min-h-[200px]"
              />

              <div className="flex items-center gap-2 mb-2">
                <input
                  type="file"
                  id="csv-file-upload"
                  className="hidden"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('csv-file-upload')?.click()}
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload CSV file
                </Button>
                <Button onClick={processCSV}>Process CSV data</Button>
              </div>
            </div>
          </div>

          <h4>3. "Process CSV" and check the results - data is not imported yet</h4>

          {unmatchedCards.length > 0 && (
            <div className="p-2 bg-red-200 dark:bg-red-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Not matched Cards ({unmatchedCards.length})</h3>
                <Button variant="outline" onClick={() => setShowUnmatched(!showUnmatched)}>
                  {showUnmatched ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showUnmatched && (
                <>
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Set</TableHead>
                          <TableHead>Card Number</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Foil</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmatchedCards.map((card, index) => (
                          <TableRow key={`unmatched-${index}`}>
                            <TableCell>{card.set}</TableCell>
                            <TableCell>{card.cardNumber}</TableCell>
                            <TableCell>{card.count}</TableCell>
                            <TableCell>{card.isFoil ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      These rows were not matched:
                    </p>
                    <Textarea
                      readOnly
                      value={formatUnmatchedCardsToCSV()}
                      className="min-h-[100px]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {matchedCards.length > 0 && (
            <div className="p-2 bg-green-200 dark:bg-green-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Matched Cards ({matchedCards.length})</h3>
                <Button variant="outline" onClick={() => setShowMatched(!showMatched)}>
                  {showMatched ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showMatched && (
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Card Name</TableHead>
                        <TableHead>Set</TableHead>
                        <TableHead>Card Number</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Foil</TableHead>
                        <TableHead>Variant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchedCards.map((card, index) => (
                        <TableRow key={`matched-${index}`}>
                          <TableCell>{card.cardName}</TableCell>
                          <TableCell>{card.set}</TableCell>
                          <TableCell>{card.cardNumber}</TableCell>
                          <TableCell>{card.count}</TableCell>
                          <TableCell>{card.isFoil ? 'Yes' : 'No'}</TableCell>
                          <TableCell>{card.variantName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <h4>4. Import</h4>
          <DialogFooter>Finish import</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionInputImport;
