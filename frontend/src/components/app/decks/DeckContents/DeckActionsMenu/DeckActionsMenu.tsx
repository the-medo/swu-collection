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
import { DeckLayout, DeckGroupBy } from '../../../../../../../types/enums.ts';

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
    { id: DeckLayout.TEXT, label: 'Text', icon: <FileText className="h-4 w-4 mr-2" /> },
    {
      id: DeckLayout.TEXT_CONDENSED,
      label: 'Text condensed',
      icon: <FileText className="h-4 w-4 mr-2" />,
    },
    { id: DeckLayout.VISUAL_GRID, label: 'Grid', icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    {
      id: DeckLayout.VISUAL_GRID_OVERLAP,
      label: 'Grid - Overlap',
      icon: <LayoutGrid className="h-4 w-4 mr-2" />,
    },
    {
      id: DeckLayout.VISUAL_STACKS,
      label: 'Stacks',
      icon: <LayoutList className="h-4 w-4 mr-2" />,
    },
    {
      id: DeckLayout.VISUAL_STACKS_SPLIT,
      label: 'Stacks - Split',
      icon: <LayoutList className="h-4 w-4 mr-2" />,
    },
  ];

  const groupByOptions = [
    { id: DeckGroupBy.CARD_TYPE, label: 'Card Type' },
    { id: DeckGroupBy.COST, label: 'Cost' },
    { id: DeckGroupBy.ASPECT, label: 'Aspect' },
    { id: DeckGroupBy.TRAIT, label: 'Trait' },
    { id: DeckGroupBy.KEYWORDS, label: 'Keywords' },
  ];

  return (
    <NavigationMenu className="rounded-md border-border bg-accent p-1 w-full mb-2 flex-wrap gap-1 justify-end">
      <NavigationMenuList className="flex-wrap justify-start gap-1">
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
          <NavigationMenuTrigger className="justify-start border w-[180px]">
            <Download className="h-4 w-4 mr-2" />
            Export
          </NavigationMenuTrigger>
          <NavigationMenuContent>
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
      </NavigationMenuList>
      <NavigationMenuList className="flex-wrap justify-start gap-1">
        {/* Decklist / Charts Tabs */}
        <NavigationMenuItem>
          <Tabs
            value={tabsValue}
            onValueChange={onTabsValueChange}
            className="w-auto border rounded-md"
          >
            <TabsList>
              <TabsTrigger value="decklist">Decklist</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>
          </Tabs>
        </NavigationMenuItem>

        {/* Deck Layout Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger className="w-[220px] justify-start border">
            <LayoutGrid className="h-4 w-4 mr-0" />
            <span className="text-xs">Layout: </span>
            {layoutOptions.find(option => option.id === layout)?.label || 'Default'}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 w-[220px] md:w-[440px]">
              <div className="col-span-1 hidden md:block">
                <Skeleton className="w-full h-[200px] rounded-md" />
              </div>
              <div className="col-span-1 grid grid-cols-1 gap-1">
                {layoutOptions.map(option => (
                  <li
                    key={option.id}
                    onClick={() => setLayout(option.id)}
                    className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
                  >
                    <NavigationMenuLink asChild>
                      <div className="text-sm leading-none font-medium">{option.label}</div>
                    </NavigationMenuLink>
                  </li>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Group By Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger className="w-[220px] justify-start border">
            <BarChart className="h-4 w-4 mr-0" />
            <span className="text-xs">Group by: </span>
            {groupByOptions.find(option => option.id === groupBy)?.label || 'Default'}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="p-4 grid grid-cols-1 gap-4 w-[220px]">
              <div className="col-span-1 grid grid-cols-1 gap-1">
                {groupByOptions.map(option => (
                  <li
                    key={option.id}
                    onClick={() => setGroupBy(option.id)}
                    className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
                  >
                    <NavigationMenuLink asChild>
                      <div className="text-sm leading-none font-medium">{option.label}</div>
                    </NavigationMenuLink>
                  </li>
                ))}
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default DeckActionsMenu;
