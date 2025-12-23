import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '@/components/ui/navigation-menu.tsx';
import { ClipboardCopy, DollarSign, Download, FileJson, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import {
  createDeckJsonExport,
  createDeckTextExport,
  downloadAsFile,
} from '../../../../../../../../server/lib/decks/deckExport.ts';
import { cardPriceSourceInfo } from '../../../../../../../../types/CardPrices.ts';
import { cn } from '@/lib/utils.ts';

interface ExportOptionsMenuProps {
  deckData: any;
  deckCardsData: any;
  cardListData: any;
  compact?: boolean;
}

const ExportOptionsMenu: React.FC<ExportOptionsMenuProps> = ({
  deckData,
  deckCardsData,
  cardListData,
  compact,
}) => {
  const { toast } = useToast();

  const handleExportJSON = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to export deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }

    const jsonData = createDeckJsonExport(
      deckData.deck,
      deckCardsData.data,
      deckData.user,
      cardListData.cards,
    );

    const jsonString = JSON.stringify(jsonData, null, 2);
    const safeFileName = deckData.deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    downloadAsFile(jsonString, `${safeFileName}.json`, 'application/json');

    toast({
      title: 'Deck exported as JSON',
      description: `${deckData.deck.name} was exported successfully.`,
    });
  };

  const handleExportText = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to export deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }

    const textData = createDeckTextExport(deckData.deck, deckCardsData.data, cardListData.cards);

    const safeFileName = deckData.deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    downloadAsFile(textData, `${safeFileName}.txt`, 'text/plain');

    toast({
      title: 'Deck exported as text',
      description: `${deckData.deck.name} was exported successfully.`,
    });
  };

  const handleCopyJSON = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to copy deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }

    const jsonData = createDeckJsonExport(
      deckData.deck,
      deckCardsData.data,
      deckData.user,
      cardListData.cards,
    );

    const jsonString = JSON.stringify(jsonData, null, 2);

    navigator.clipboard.writeText(jsonString);

    toast({
      title: 'JSON copied to clipboard',
      description: `${deckData.deck.name} was copied in JSON format.`,
    });
  };

  const handleCopyText = () => {
    if (!deckData || !deckCardsData || !cardListData) {
      toast({
        variant: 'destructive',
        title: 'Unable to copy deck',
        description: 'Required data is not available. Please try again later.',
      });
      return;
    }

    const textData = createDeckTextExport(deckData.deck, deckCardsData.data, cardListData.cards);

    navigator.clipboard.writeText(textData);

    toast({
      title: 'Text copied to clipboard',
      description: `${deckData.deck.name} was copied in text format.`,
    });
  };

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={cn('justify-start border', compact ? '' : 'w-[180px]')}>
        <Download className="h-4 w-4" />
        {!compact && 'Export'}
      </NavigationMenuTrigger>
      <NavigationMenuContent className="z-10">
        <div className="p-2 w-[180px]">
          <h4 className="mb-2 text-sm font-medium">Download</h4>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleExportJSON}
            >
              <FileJson className="h-4 w-4 mr-2" />
              Download .json
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleExportText}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download .txt
            </Button>
          </div>

          <div className="mt-4 pt-2 border-t">
            <h4 className="mb-2 text-sm font-medium">Copy to clipboard</h4>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleCopyJSON}
              >
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleCopyText}
              >
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copy text
              </Button>
            </div>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default ExportOptionsMenu;
