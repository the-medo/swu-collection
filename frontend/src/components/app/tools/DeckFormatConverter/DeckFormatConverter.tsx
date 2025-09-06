import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Upload, RefreshCw, Save, FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCardList } from '@/api/lists/useCardList';
import type { DeckExportJSON } from '../../../../../../server/lib/decks/deckExport.ts';
import {
  parseMeleeToText,
  parseTextToJson,
} from '../../../../../../server/lib/decks/deckConverterService.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const DeckFormatConverter: React.FC = () => {
  const [inputMelee, setInputMelee] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [jsonOutput, setJsonOutput] = useState<DeckExportJSON | null>(null);
  const [author, setAuthor] = useState<string>('');
  const [deckName, setDeckName] = useState<string>('Imported Deck');
  const [activeTab, setActiveTab] = useState<string>('melee');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cardStats, setCardStats] = useState<{ matched: number; unmatched: number }>({
    matched: 0,
    unmatched: 0,
  });
  const { toast } = useToast();
  const { data: cardListData, isFetching: isCardDataLoading } = useCardList();

  // Load saved input from localStorage on component mount
  useEffect(() => {
    const savedInputMelee = localStorage.getItem('deck-converter-input-melee');
    const savedInputText = localStorage.getItem('deck-converter-input-text');
    const savedName = localStorage.getItem('deck-converter-name');
    const savedAuthor = localStorage.getItem('deck-converter-author');

    if (savedInputMelee) setInputMelee(savedInputMelee);
    if (savedInputText) setInputText(savedInputText);
    if (savedName) setDeckName(savedName);
    if (savedAuthor) setAuthor(savedAuthor);
  }, []);

  // Save input to localStorage when it changes
  const saveToLocalStorage = () => {
    localStorage.setItem('deck-converter-input-melee', inputMelee);
    localStorage.setItem('deck-converter-input-text', inputText);
    localStorage.setItem('deck-converter-name', deckName);
    localStorage.setItem('deck-converter-author', author);

    toast({
      title: 'Saved',
      description: 'Your deck list has been saved to local storage.',
    });
  };

  const handleConvertToJsonFromMelee = () => {
    if (!inputMelee.trim()) {
      toast({
        title: 'No input provided',
        description: 'Please enter a deck list to convert.',
        variant: 'destructive',
      });
      return;
    }
    const text = parseMeleeToText(inputMelee);
    setInputText(text);
    handleConvertToJson(text);
  };

  const handleConvertToJsonFromText = () => {
    handleConvertToJson(inputText);
  };

  const handleConvertToJson = (text: string) => {
    if (!text.trim()) {
      toast({
        title: 'No input provided',
        description: 'Please enter a deck list to convert.',
        variant: 'destructive',
      });
      return;
    }

    if (!cardListData) {
      toast({
        title: 'Loading card data',
        description: 'Please wait while we load the card database.',
      });
      return;
    }

    setIsLoading(true);
    let matched = 0;
    let unmatched = 0;

    try {
      const [result, unmatchedSection] = parseTextToJson(
        text,
        cardListData.cards,
        deckName || 'Imported Deck',
        author || 'Anonymous',
      );

      [...(result.deck || []), ...(result.sideboard || [])].forEach(card => {
        matched += card.count;
      });
      unmatchedSection.cards.forEach(card => {
        unmatched += card.count;
      });

      setCardStats({ matched, unmatched });
      setJsonOutput(result);
      setActiveTab('json');

      toast({
        title: 'Conversion successful',
        description: `Deck list converted to JSON format. ${matched} cards matched, ${unmatched} unmatched.`,
      });
    } catch (error) {
      toast({
        title: 'Conversion failed',
        description: (error as Error).message || 'Failed to convert deck list to JSON.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setInputMelee(content);
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

  const copyToClipboard = () => {
    if (!jsonOutput) return;

    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    toast({
      title: 'Copied to clipboard',
      description: 'JSON has been copied to your clipboard.',
    });
  };

  const downloadJson = () => {
    if (!jsonOutput) return;

    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${jsonOutput.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setInputMelee('');
    setInputText('');
    setJsonOutput(null);
    setAuthor('');
    setDeckName('Imported Deck');
    localStorage.removeItem('deck-converter-input-melee');
    localStorage.removeItem('deck-converter-input-text');
    localStorage.removeItem('deck-converter-name');
    localStorage.removeItem('deck-converter-author');
    setCardStats({ matched: 0, unmatched: 0 });
  };

  return (
    <div className="flex flex-col gap-4">
      {isCardDataLoading && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <AlertTitle>Loading card database</AlertTitle>
          <AlertDescription>
            Please wait while we load the card database. This is required for card name matching.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label htmlFor="deckName" className="text-sm font-medium mb-1 block">
            Deck Name
          </label>
          <input
            id="deckName"
            className="w-full p-2 border rounded bg-background text-foreground border-input"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            placeholder="Deck Name"
          />
        </div>
        <div>
          <label htmlFor="author" className="text-sm font-medium mb-1 block">
            Author
          </label>
          <input
            id="author"
            className="w-full p-2 border rounded bg-background text-foreground border-input"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Author Name"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="melee">Melee Input</TabsTrigger>
          <TabsTrigger value="text">Text Input</TabsTrigger>
          <TabsTrigger value="json">
            JSON Output
            {jsonOutput && cardStats.unmatched > 0 && (
              <Badge variant="destructive" className="ml-2">
                {cardStats.unmatched} unmatched
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="melee" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Melee Input</CardTitle>
                <CardDescription>
                  On melee.gg decklist page, you can go to "Actions", "Copy to Clipboard" and paste
                  the text here.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveToLocalStorage}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your deck list here..."
                value={inputMelee}
                onChange={e => setInputMelee(e.target.value)}
                rows={20}
                className="font-mono"
              />
              <div className="flex flex-wrap mt-4 gap-2 justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearAll}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    handleConvertToJsonFromMelee();
                  }}
                  disabled={isLoading || isCardDataLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Convert to JSON
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            <CardHeader>
              <CardTitle>Sample Format</CardTitle>
              <CardDescription>
                Here's an example of a properly formatted deck list:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Sample Input Format</h4>
                  <pre className="bg-muted p-4 rounded overflow-auto text-xs md:text-sm max-h-[300px]">
                    {`MainDeck
1 Armed to the Teeth
1 Crafty Smuggler
3 ISB Agent

Sideboard
2 Allegiant General Pryde | Ruthless and Loyal

Leader
1 Jango Fett | Concealing the Conspiracy

Base
1 Tarkintown`}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setInputMelee(`MainDeck
1 Armed to the Teeth
1 Crafty Smuggler
3 ISB Agent

Sideboard
2 Allegiant General Pryde | Ruthless and Loyal

Leader
1 Jango Fett | Concealing the Conspiracy

Base
1 Tarkintown`);
                      setDeckName('Sample Rebel Deck');
                      setAuthor('SWU Base');
                    }}
                  >
                    Use Sample
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Text Input</CardTitle>
                <CardDescription>
                  Paste your deck list here. Each line should follow the format: "1 | Card Name" or
                  "1 | Card Name | Subtitle".
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveToLocalStorage}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your deck list here..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                rows={20}
                className="font-mono"
              />
              <div className="flex flex-wrap mt-4 gap-2 justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearAll}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <Button
                  onClick={handleConvertToJsonFromText}
                  disabled={isLoading || isCardDataLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Convert to JSON
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            <CardHeader>
              <CardTitle>Sample Format</CardTitle>
              <CardDescription>
                Here's an example of a properly formatted deck list:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Sample Input Format</h4>
                  <pre className="bg-muted p-4 rounded overflow-auto text-xs md:text-sm max-h-[300px]">
                    {`Leaders
1 | Han Solo | Captain of the Millennium Falcon

Base
1 | Command Center

Deck
2 | Luke Skywalker | Jedi Knight
3 | Chewbacca | Wookiee Warrior
2 | R2-D2 | Astromech Droid

Sideboard
1 | Leia Organa | Rebel Leader
2 | C-3PO | Protocol Droid`}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setInputText(`Leaders
1 | Han Solo | Captain of the Millennium Falcon

Base
1 | Command Center

Deck
2 | Luke Skywalker | Jedi Knight
3 | Chewbacca | Wookiee Warrior
2 | R2-D2 | Astromech Droid

Sideboard
1 | Leia Organa | Rebel Leader
2 | C-3PO | Protocol Droid`);
                      setDeckName('Sample Rebel Deck');
                      setAuthor('SWU Base');
                    }}
                  >
                    Use Sample
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">JSON Output</CardTitle>
                <CardDescription>
                  The converted deck list in JSON format, ready to import into SWU Base.
                </CardDescription>
              </div>
              {jsonOutput && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="whitespace-nowrap">
                    {jsonOutput.deck?.reduce((p, c) => p + c.count, 0) || 0} main cards (
                    {jsonOutput.deck?.length || 0} different)
                  </Badge>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {jsonOutput.sideboard?.reduce((p, c) => p + c.count, 0) || 0} sideboard cards (
                    {jsonOutput.sideboard?.length || 0} different)
                  </Badge>
                  {cardStats.matched > 0 && (
                    <Badge variant="success" className="whitespace-nowrap">
                      {cardStats.matched} matched
                    </Badge>
                  )}
                  {cardStats.unmatched > 0 && (
                    <Badge variant="destructive" className="whitespace-nowrap">
                      {cardStats.unmatched} unmatched
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!jsonOutput ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No JSON output yet. Convert your text input first.</p>
                </div>
              ) : (
                <>
                  {cardStats.unmatched > 0 && (
                    <Alert className="mb-4 bg-destructive/10">
                      <AlertTitle>Some cards couldn't be matched</AlertTitle>
                      <AlertDescription>
                        {cardStats.unmatched} cards couldn't be matched to the database. They may
                        have typos or are not recognized. Check the JSON output and fix any issues
                        in the text input.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Textarea
                    value={jsonOutput ? JSON.stringify(jsonOutput, null, 2) : ''}
                    readOnly
                    rows={20}
                    className="font-mono"
                  />
                </>
              )}
              <div className="flex mt-4 gap-2 justify-end">
                <Button variant="outline" onClick={() => setActiveTab('melee')}>
                  Back to Input
                </Button>
                <Button variant="outline" onClick={copyToClipboard} disabled={!jsonOutput}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button onClick={downloadJson} disabled={!jsonOutput}>
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card></Card>
    </div>
  );
};

export default DeckFormatConverter;
