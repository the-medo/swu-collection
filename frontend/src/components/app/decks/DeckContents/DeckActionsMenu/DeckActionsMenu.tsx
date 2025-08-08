import * as React from 'react';
import { useMemo } from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  BookCopy,
  ClipboardCopy,
  Download,
  FileJson,
  FileText,
  LinkIcon,
  Loader2,
  Pencil,
  Star,
  LayoutGrid,
  LayoutList,
  BarChart,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useDuplicateDeck } from '@/api/decks/useDuplicateDeck.ts';
import { useNavigate } from '@tanstack/react-router';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  createDeckJsonExport,
  createDeckTextExport,
  downloadAsFile,
} from '../../../../../../../server/lib/decks/deckExport.ts';
import DeckImageButton from '@/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx';
import { usePostDeckFavorite } from '@/api/decks/usePostDeckFavorite.ts';
import { useUser } from '@/hooks/useUser.ts';
import AddToComparerButton from '@/components/app/comparer/SidebarComparer/AddToComparerButton.tsx';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';
import { useRole } from '@/hooks/useRole.ts';
import { cn } from '@/lib/utils.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';

interface DeckActionsMenuProps {
  deckId: string;
  tabsValue?: string;
  onTabsValueChange?: (value: string) => void;
}

const DeckActionsMenu: React.FC<DeckActionsMenuProps> = ({
  deckId,
  tabsValue = 'decklist',
  onTabsValueChange,
}) => {
  const user = useUser();
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  const { toast } = useToast();
  const { data: deckData } = useGetDeck(deckId);
  const { data: deckCardsData } = useGetDeckCards(deckId);
  const { data: cardListData } = useCardList();
  const duplicateMutation = useDuplicateDeck();
  const navigate = useNavigate();
  const favoriteDeckMutation = usePostDeckFavorite(deckId);

  // Layout and grouping stores
  const { data: layout } = useGetUserSetting('deckLayout');
  const { mutate: setLayout } = useSetUserSetting('deckLayout');
  const { data: groupBy } = useGetUserSetting('deckGroupBy');
  const { mutate: setGroupBy } = useSetUserSetting('deckGroupBy');

  const deckLink = `${window.location.origin}/decks/${deckId}`;
  const isFavorite = !!deckData?.isFavorite;

  const additionalData: ComparerEntryAdditionalData = useMemo(
    () => ({
      title: deckData?.deck.name,
    }),
    [deckData?.deck],
  );

  const handleFavoriteClick = () => {
    if (!user) {
      toast({
        variant: 'warning',
        title: 'Unable to favorite a deck',
        description: 'Please sign in to do this action.',
      });
      return;
    }

    favoriteDeckMutation.mutate({ isFavorite: !isFavorite });
  };

  const handleDuplicate = async () => {
    if (!user) {
      toast({
        variant: 'warning',
        title: 'Unable to duplicate a deck',
        description: 'Please sign in to do this action.',
      });
      return;
    }

    try {
      const result = await duplicateMutation.mutateAsync(deckId);
      void navigate({ to: `/decks/${result.data.id}` });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deckLink);
    toast({
      title: `Link copied to clipboard`,
    });
  };

  const layoutOptions = [
    { id: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { id: 'list', label: 'List', icon: <LayoutList className="h-4 w-4 mr-2" /> },
    { id: 'compact', label: 'Compact', icon: <LayoutList className="h-4 w-4 mr-2" /> },
    { id: 'text', label: 'Text', icon: <FileText className="h-4 w-4 mr-2" /> },
    { id: 'image', label: 'Image', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { id: 'full', label: 'Full', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
  ];

  const groupByOptions = [
    { id: 'type', label: 'Type' },
    { id: 'cost', label: 'Cost' },
    { id: 'faction', label: 'Faction' },
    { id: 'rarity', label: 'Rarity' },
    { id: 'none', label: 'None' },
  ];

  return (
    <NavigationMenu className="border rounded-md border-border bg-background p-1">
      <NavigationMenuList className="flex-wrap justify-start gap-0">
        {/* Decklist / Charts Tabs */}
        <NavigationMenuItem className="ml-auto">
          <Tabs value={tabsValue} onValueChange={onTabsValueChange} className="w-auto">
            <TabsList>
              <TabsTrigger value="decklist">Decklist</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>
          </Tabs>
        </NavigationMenuItem>

        {/* Favorite Button */}
        <NavigationMenuItem>
          <Button
            variant={isFavorite ? 'default' : 'outline'}
            size="icon"
            onClick={handleFavoriteClick}
            title={isFavorite ? 'Unfavorite this deck' : 'Favorite this deck'}
            disabled={favoriteDeckMutation.isPending}
          >
            {favoriteDeckMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Star className={isFavorite ? 'fill-current' : ''} />
            )}
          </Button>
        </NavigationMenuItem>

        {/* Copy Link Button */}
        <NavigationMenuItem>
          <Button
            variant="outline"
            size="default"
            className={cn({
              'opacity-80': !deckData?.deck.public,
            })}
            onClick={handleCopyLink}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Copy link {!deckData?.deck.public && '(private!)'}
          </Button>
        </NavigationMenuItem>

        {/* Comparer Button */}
        <NavigationMenuItem>
          <AddToComparerButton
            id={deckId}
            dataType="deck"
            additionalData={additionalData}
            size="default"
          />
        </NavigationMenuItem>

        {/* Duplicate Button */}
        <NavigationMenuItem>
          <Button
            variant="outline"
            size="default"
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending}
          >
            <BookCopy className="h-4 w-4 mr-2" />
            {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </NavigationMenuItem>

        {/* Image Button (colorful) */}
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <DeckImageButton deckId={deckId} />
          </NavigationMenuLink>
        </NavigationMenuItem>

        {/* Export Options */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Download className="h-4 w-4 mr-2" />
            Export
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="p-2 w-[220px]">
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
                    Copy JSON format
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleCopyText}
                  >
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    Copy text format
                  </Button>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Admin Edit Button */}
        {isAdmin && (
          <NavigationMenuItem>
            <Button
              size="iconMedium"
              variant="destructive"
              title="Edit deck"
              onClick={() => window.open(`/decks/${deckId}/edit`, '_blank')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </NavigationMenuItem>
        )}

        {/* Deck Layout Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Layout
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="p-4 grid grid-cols-2 gap-4 w-[500px]">
              <div className="col-span-1">
                <Skeleton className="w-full h-[200px] rounded-md" />
              </div>
              <div className="col-span-1 grid grid-cols-1 gap-2">
                {layoutOptions.map(option => (
                  <Button
                    key={option.id}
                    variant={layout === option.id ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setLayout(option.id)}
                  >
                    {option.icon}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Group By Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <BarChart className="h-4 w-4 mr-2" />
            Group By
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="p-2 w-[180px]">
              {groupByOptions.map(option => (
                <Button
                  key={option.id}
                  variant={groupBy === option.id ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start mb-1"
                  onClick={() => setGroupBy(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default DeckActionsMenu;
