import { useSidebar } from '@/components/ui/sidebar.tsx';
import DeckPlayButton from './DeckPlayButton.tsx';
import DeckLeaderBase from '@/components/app/decks/DeckContents/DeckLeaderBase.tsx';
import DeckCards from '@/components/app/decks/DeckContents/DeckCards/DeckCards.tsx';
import DeckInputCommand from '@/components/app/decks/DeckContents/DeckInputCommand/DeckInputCommand.tsx';
import { useDeckInfo } from './useDeckInfoStore.ts';
import { useRef, useState } from 'react';
import DeckActionsMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/DeckActionsMenu.tsx';
import DeckActionsMenuCompact from '@/components/app/decks/DeckContents/DeckActionsMenu/DeckActionsMenuCompact.tsx';
import DeckBoardCardCounts from '@/components/app/decks/DeckContents/DeckBoardCardCounts/DeckBoardCardCounts.tsx';
import DeckMatches from '@/components/app/decks/DeckContents/DeckMatches/DeckMatches.tsx';
import DeckStats from '@/components/app/decks/DeckContents/DeckStats/DeckStats.tsx';
import DeckNavigationMenu from '@/components/app/decks/DeckContents/DeckNavigationMenu/DeckNavigationMenu.tsx';
import DeckLayoutMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/components/DeckLayoutMenu.tsx';
import GroupByMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/components/GroupByMenu.tsx';
import * as React from 'react';
import DecklistChartsTabs from '@/components/app/decks/DeckContents/DeckActionsMenu/components/DecklistChartsTabs.tsx';
import { NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu.tsx';
import DeckImageButton from '@/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx';
import { Link } from '@tanstack/react-router';
import { BookOpen, EyeIcon, Hammer, TriangleAlert } from 'lucide-react';
import DeckGradientButton from '@/components/app/decks/DeckContents/DeckImage/DeckGradientButton.tsx';
import DeckCollection from '@/components/app/decks/DeckContents/DeckCollection/DeckCollection.tsx';
import { useCardPoolDeckDetailStoreActions } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import DeckPricing from '@/components/app/decks/DeckContents/DeckPricing/DeckPricing.tsx';
import DeckTitleBarCompact from '@/components/app/decks/DeckContents/DeckTitlebarCompact/DeckTitleBarCompact.tsx';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import { aspectArray } from '../../../../../../types/iterableEnumInfo.ts';
import { SwuAspect, SwuSet } from '../../../../../../types/enums.ts';
import { setRestrictionByFormat } from '../../../../../../types/Format.ts';
import { setArray } from '../../../../../../lib/swu-resources/set-info.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { useGetDeckArticle } from '@/api/decks/useGetDeckArticle.ts';
import { useGetDeckDiscussion } from '@/api/decks/useGetDeckDiscussion.ts';
import { isPostEmpty } from '../../../../../../shared/posts/content.ts';
import DeckDiscussion from '../DeckDiscussion/DeckDiscussion.tsx';
import { deckDetailTabSchema, type DeckDetailTab } from '../DeckDetail/deckDetailSearch.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

interface DeckContentsProps {
  deckId: string;
  setDeckId?: (id: string) => void;
  highlightedCardId?: string;
  deckbuilder?: boolean;
  compact?: boolean;
  embedded?: boolean;
  tab?: DeckDetailTab;
  onTabChange?: (tab: DeckDetailTab) => void;
  discussion?: {
    ownerId: string;
    editing: boolean;
    onEditingChange?: (editing: boolean) => void;
  };
}

const getDeckCardsKarabastMessage = (count: number) =>
  count === 1
    ? '1 main deck/sideboard card is not implemented in Karabast.'
    : `${count} different main deck/sideboard cards are not implemented in Karabast.`;

const getLeaderBaseKarabastMessage = (count: number) =>
  `${count} leader/base ${count === 1 ? 'card is' : 'cards are'} not implemented in Karabast.`;

const DeckContents: React.FC<DeckContentsProps> = ({
  deckId,
  setDeckId,
  highlightedCardId,
  deckbuilder,
  compact,
  embedded = false,
  tab,
  onTabChange,
  discussion,
}) => {
  const { isMobile } = useSidebar();
  const { cardPoolId, owned, editable } = useDeckInfo(deckId);
  const {
    deckMeta,
    karabastUnimplementedDeckCardsSummary,
    karabastUnimplementedLeaderBaseSummary,
  } = useDeckData(deckId);
  const [localTab, setLocalTab] = useState<DeckDetailTab>('decklist');
  const subpages = useRef<HTMLDivElement>(null);
  const user = useUser();
  const { data: collectionInfoInDecks } = useGetUserSetting('collectionInfoInDecks');
  const requestedTab = tab ?? localTab;
  const tabsValue =
    (requestedTab === 'collection' && (!user || !collectionInfoInDecks)) ||
    (requestedTab === 'article' && !discussion)
      ? 'decklist'
      : requestedTab;
  const setTabsValue = (value: string) => {
    const parsed = deckDetailTabSchema.safeParse(value);
    if (!parsed.success) return;
    if (onTabChange) onTabChange(parsed.data);
    else setLocalTab(parsed.data);
  };
  const articleTab = tabsValue === 'article' && !!discussion;
  const article = useGetDeckArticle(deckId, !!discussion);
  const comments = useGetDeckDiscussion(deckId, !!discussion);
  const hasArticle = !article.isError && !!article.data && !isPostEmpty(article.data.content);
  const showGuide = !!discussion && (hasArticle || user?.id === discussion.ownerId);
  const commentCount = comments.isError ? 0 : (comments.data?.total ?? 0);
  const { setDeckView } = useCardPoolDeckDetailStoreActions();
  const karabastUnimplementedDeckCardsCount =
    karabastUnimplementedDeckCardsSummary.uniqueCardIds.length;
  const karabastUnimplementedLeaderBaseCount =
    karabastUnimplementedLeaderBaseSummary.uniqueCardIds.length;

  const deckbuilderSearch = React.useMemo(() => {
    const aspectSet = new Set<SwuAspect>();

    [deckMeta.leader1, deckMeta.leader2, deckMeta.base].forEach(card => {
      card?.aspects.forEach(aspect => {
        aspectSet.add(aspect);
      });
    });

    const aspects = aspectArray.filter(aspect => aspectSet.has(aspect));
    const restrictedSets = setRestrictionByFormat[deckMeta.format];
    const sets = restrictedSets
      ? setArray.filter(set => restrictedSets[set.code as SwuSet]).map(set => set.code as SwuSet)
      : undefined;

    return {
      deckbuilder: true,
      sort: 'relevance' as const,
      order: 'asc' as const,
      aspects: aspects.length > 0 ? aspects : undefined,
      sets: sets && sets.length > 0 ? sets : undefined,
    };
  }, [deckMeta.base, deckMeta.format, deckMeta.leader1, deckMeta.leader2]);

  return (
    <>
      {!deckbuilder && !compact && <DeckActionsMenu deckId={deckId} />}
      {!deckbuilder && compact && (
        <>
          <DeckTitleBarCompact deckId={deckId} setDeckId={setDeckId} />
          <DeckActionsMenuCompact deckId={deckId} tabs={tabsValue} setTabsValue={setTabsValue} />
        </>
      )}
      <div className="@container/deck-contents w-full">
        <div className="flex flex-col justify-center gap-2 w-full @[700px]/deck-contents:flex-row">
          {!deckbuilder && !compact && (
            <div data-deck-sidebar className="flex flex-row flex-wrap justify-center w-full gap-2 items-center self-start @[700px]/deck-contents:w-[350px] @[700px]/deck-contents:shrink-0 @[700px]/deck-contents:flex-col @[700px]/deck-contents:justify-start">
              {!compact && (
                <div className="flex flex-row gap-2 flex-wrap items-center justify-center">
                  <DeckLeaderBase deckId={deckId} size={embedded && isMobile ? 'w200' : 'w300'} />
                </div>
              )}
              {editable && (
                <Link to="/decks/$deckId/edit" params={{ deckId }} search={deckbuilderSearch}>
                  <DeckGradientButton deckId={deckId} variant="outline" size="lg" className="w-56 max-w-full">
                    <Hammer className="mr-4" />
                    <span className="font-['Satoshi',sans-serif] text-xl font-semibold tracking-tight">Deckbuilder</span>
                  </DeckGradientButton>
                </Link>
              )}
              {showGuide && (
                <DeckGradientButton
                  deckId={deckId}
                  variant="outline"
                  size="lg"
                  className="w-56 max-w-full"
                  onClick={() => {
                    setTabsValue('article');
                    subpages.current?.scrollIntoView({ block: 'start' });
                  }}
                >
                  <BookOpen className="mr-4" />
                  <span className="font-['Satoshi',sans-serif] text-xl font-semibold tracking-tight">Guide</span>
                </DeckGradientButton>
              )}
              <DeckPricing deckId={deckId} showReloadButtonWhenNoPrices={true} />
              {cardPoolId && (
                <>
                  <Link
                    to="/limited/pool/$poolId/detail"
                    params={{ poolId: cardPoolId }}
                    className="w-full"
                    onClick={() => setDeckView(false)}
                  >
                    <DeckGradientButton
                      deckId={deckId}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <EyeIcon className="mr-4" />
                      <h4 className="mb-0!">View card pool</h4>
                    </DeckGradientButton>
                  </Link>
                  {owned && (
                    <Link
                      to="/limited/deck/$deckId"
                      params={{ deckId }}
                      className="w-full"
                      onClick={() => setDeckView(false)}
                    >
                      <DeckGradientButton
                        deckId={deckId}
                        variant="outline"
                        size="lg"
                        className="w-full"
                      >
                        <Hammer className="mr-4" />
                        <h4 className="mb-0!">Edit deck</h4>
                      </DeckGradientButton>
                    </Link>
                  )}
                </>
              )}
              <DeckMatches deckId={deckId} setDeckId={setDeckId} />
            </div>
          )}
          <div className="min-w-0 w-full flex-1">
            <div className="flex flex-col gap-2 w-full">
              <div
                ref={subpages}
                className="flex flex-wrap justify-between gap-4 max-lg:justify-center max-lg:border-t max-lg:pt-2 border-b pb-2"
              >
                <DeckNavigationMenu gradient={!compact} deckId={deckId} className="justify-between">
                  {compact && (
                    <NavigationMenuList className="flex-wrap justify-start gap-1">
                      <DeckBoardCardCounts deckId={deckId} />
                    </NavigationMenuList>
                  )}
                  {!compact && (
                    <>
                      <NavigationMenuList className="flex-wrap justify-start gap-1">
                        <DecklistChartsTabs
                          deckId={deckId}
                          value={tabsValue}
                          onValueChange={setTabsValue}
                          discussionCount={commentCount}
                          discussionLabel={
                            discussion
                              ? `${showGuide ? 'Guide' : 'Comments'} (${commentCount})`
                              : undefined
                          }
                        />
                        {!articleTab && (
                          <NavigationMenuItem>
                            <div className="w-full flex justify-center bg-background rounded-md">
                              <DeckImageButton deckId={deckId} />
                            </div>
                          </NavigationMenuItem>
                        )}
                        {!articleTab && (
                          <NavigationMenuItem>
                            <div className="w-full flex justify-center bg-background rounded-md">
                              <DeckPlayButton deckId={deckId} />
                            </div>
                          </NavigationMenuItem>
                        )}
                      </NavigationMenuList>
                    </>
                  )}
                  {!articleTab && (
                    <NavigationMenuList className="flex-wrap justify-start gap-1">
                      {editable ? (
                        <DeckInputCommand deckId={deckId} />
                      ) : (
                        <>
                          <NavigationMenuList className="flex-wrap flex-1 self-end gap-1">
                            <DeckLayoutMenu compact={compact} />
                            <GroupByMenu compact={compact} />
                          </NavigationMenuList>
                        </>
                      )}
                    </NavigationMenuList>
                  )}
                  {!articleTab && editable && (
                    <NavigationMenuList className="flex-wrap justify-end gap-1">
                      <DeckLayoutMenu />
                      <GroupByMenu />
                    </NavigationMenuList>
                  )}
                </DeckNavigationMenu>
              </div>
              {deckbuilder && (
                <div className="flex flex-1 flex-row gap-2 flex-wrap items-center justify-center ">
                  <DeckLeaderBase deckId={deckId} size="w200" />
                </div>
              )}
              {!compact && !articleTab && (
                <div className="flex flex-wrap gap-4 items-center max-lg:justify-center w-full">
                  <DeckBoardCardCounts deckId={deckId} />
                </div>
              )}
              {!articleTab && karabastUnimplementedDeckCardsCount > 0 && (
                <Alert variant="warning" size="xs">
                  <TriangleAlert className="h-4 w-4 text-yellow-600 stroke-yellow-600 dark:text-yellow-400 dark:stroke-yellow-400" />
                  <AlertDescription>
                    {getDeckCardsKarabastMessage(karabastUnimplementedDeckCardsCount)}
                  </AlertDescription>
                </Alert>
              )}
              {!articleTab && karabastUnimplementedLeaderBaseCount > 0 && (
                <Alert variant="warning" size="xs">
                  <TriangleAlert className="h-4 w-4 text-yellow-600 stroke-yellow-600 dark:text-yellow-400 dark:stroke-yellow-400" />
                  <AlertDescription>
                    {getLeaderBaseKarabastMessage(karabastUnimplementedLeaderBaseCount)}
                  </AlertDescription>
                </Alert>
              )}

              {tabsValue === 'decklist' && (
                <DeckCards
                  deckId={deckId}
                  highlightedCardId={highlightedCardId}
                  compact={compact}
                />
              )}
              {tabsValue === 'charts' && <DeckStats deckId={deckId} />}
              {tabsValue === 'collection' && <DeckCollection deckId={deckId} />}
              {articleTab && (
                <DeckDiscussion
                  key={deckId}
                  deckId={deckId}
                  ownerId={discussion.ownerId}
                  editing={discussion.editing}
                  onEditingChange={discussion.onEditingChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeckContents;
