import { useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { setShortcutConversions } from '@/api/lists/setShortcutConversions';
import { SwuSet } from '../../../../../types/enums';
import { useToast } from '@/hooks/use-toast';

interface CollectionInputImportProps {
  collectionId: string | undefined;
}

interface ImportedCard {
  set: string;
  cardNumber: string;
  count: number;
  isFoil: boolean;
}

interface MatchedCard extends ImportedCard {
  cardId: string;
  cardName: string;
  variant: string;
}

const CollectionInputImport: React.FC<CollectionInputImportProps> = () => {
  const { data } = useCardList();
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

  const processCSV = () => {
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
        cardNumber: parts[1].trim(),
        count: parseInt(parts[2].trim(), 10) || 1,
        isFoil: parts[3].trim().toLowerCase() === 'true',
      });
    }

    const matched: MatchedCard[] = [];
    const unmatched: ImportedCard[] = [];

    importedCards.forEach(card => {
      // Try to find the card in the card list
      let found = false;

      // Convert set abbreviation if needed
      const setVariants = Object.keys(setShortcutConversions);

      for (const setKey of Object.keys(data.cardsByCardNo)) {
        const setEnum = setKey as SwuSet;

        // Check if the set abbreviation matches directly
        if (setKey.toLowerCase() === card.set.toLowerCase()) {
          const cardNumberInt = parseInt(card.cardNumber, 10);
          if (data.cardsByCardNo[setEnum]?.[cardNumberInt]) {
            const cardData = data.cardsByCardNo[setEnum][cardNumberInt];
            const cardInfo = data.cards[cardData.cardId];

            matched.push({
              ...card,
              cardId: cardData.cardId,
              cardName: cardInfo.name,
              variant: cardData.variant.variantName,
            });
            found = true;
            break;
          }
        }

        // Check if the set abbreviation is in the conversion map
        for (const setVariant of setVariants) {
          if (setVariant.toLowerCase() === card.set.toLowerCase()) {
            const variantMap = setShortcutConversions[setVariant];
            const variantKeys = Object.keys(variantMap);

            for (const variantKey of variantKeys) {
              const convertedSet = variantMap[variantKey];
              if (convertedSet === setKey) {
                const cardNumberInt = parseInt(card.cardNumber, 10);
                if (data.cardsByCardNo[setEnum]?.[cardNumberInt]) {
                  const cardData = data.cardsByCardNo[setEnum][cardNumberInt];
                  const cardInfo = data.cards[cardData.cardId];

                  matched.push({
                    ...card,
                    cardId: cardData.cardId,
                    cardName: cardInfo.name,
                    variant: cardData.variant.variantName,
                  });
                  found = true;
                  break;
                }
              }
            }

            if (found) break;
          }
        }

        if (found) break;
      }

      if (!found) {
        unmatched.push(card);
      }
    });

    setMatchedCards(matched);
    setUnmatchedCards(unmatched);
  };

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
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Collection from SWUDB</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <ul>
                <li>
                  1. Download CSV of the collection in SWUDB (on the bottom of "Bulk Actions" in
                  collection)
                </li>
                <li> 2. Paste your CSV data below. The format should be:</li>
              </ul>
              <code>SET ABBREVIATION,CARDNUMBER,COUNT,ISFOIL</code>
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
                  Upload CSV
                </Button>
              </div>
              <Textarea
                placeholder="Paste CSV data here..."
                value={csvContent}
                onChange={handleCsvChange}
                className="min-h-[200px]"
              />
            </div>
          </div>

          {unmatchedCards.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Unmatched Cards ({unmatchedCards.length})</h3>
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
                      Copy this data to use it back in SWUDB:
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
            <div className="mt-4">
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
                          <TableCell>{card.variant}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button onClick={processCSV}>Process CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionInputImport;
