import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  useSelectedDeckKey,
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { X, Scale, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Route as TournamentDeckCardStatsRoute } from '@/routes/tournaments/$tournamentId/card-stats.tsx';
import { Route as TournamentDeckMetaRoute } from '@/routes/tournaments/$tournamentId/meta.tsx';
import { Route as TournamentDeckMatchupsRoute } from '@/routes/tournaments/$tournamentId/matchups.tsx';
import { Route as MetaRoute } from '@/routes/meta';
import { Route as PlanetaryQualifiersRoute } from '@/routes/tournaments/planetary-qualifiers';
import { Route as RootRoute } from '@/routes';
import { getDeckKeys } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';

export type TournamentDeckKeyFloaterRoutes =
  | typeof TournamentDeckCardStatsRoute
  | typeof TournamentDeckMatchupsRoute
  | typeof TournamentDeckMetaRoute
  | typeof MetaRoute
  | typeof RootRoute
  | typeof PlanetaryQualifiersRoute;

interface TournamentDeckKeyFloaterProps {
  route: TournamentDeckKeyFloaterRoutes;
}

const TournamentDeckKeyFloater: React.FC<TournamentDeckKeyFloaterProps> = ({ route }) => {
  const { key, metaInfo } = useSelectedDeckKey();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const labelRenderer = useLabel();
  const { decks } = useTournamentMetaStore();
  const { data: cardListData } = useCardList();
  const { clearComparerEntries, addComparerEntry } = useComparerStoreActions();
  const isMobile = useIsMobile();
  const [warning, setWarning] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);

  const navigate = useNavigate({ from: route.fullPath });

  // Load accordion state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('comparer-accordion-state');
    if (savedState) {
      setAccordionValue(savedState);
    } else {
      // Default: open on desktop, closed on mobile
      setAccordionValue(isMobile || savedState === '' ? undefined : 'comparer');
    }
  }, [isMobile]);

  // Save accordion state to localStorage when it changes
  const handleAccordionValueChange = (value: string | undefined) => {
    setAccordionValue(value);
    if (value) {
      localStorage.setItem('comparer-accordion-state', value);
    } else {
      localStorage.setItem('comparer-accordion-state', 'closed');
    }
  };

  if (!key || !metaInfo) return null;

  // Helper functions for comparer functionality
  const findDecksByPlacement = (count: number) => {
    if (!cardListData || !decks.length) return [];

    // Filter decks with the same key
    const matchingDecks = decks.filter(deck =>
      getDeckKeys(deck, metaInfo, cardListData)?.includes(key),
    );

    // Sort by placement
    const sortedDecks = [...matchingDecks].sort((a, b) => {
      const placementA = a.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      const placementB = b.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      return placementA - placementB;
    });

    // Return the first N decks (or all if less than N)
    return sortedDecks.slice(0, Math.min(count, 10));
  };

  const findDecksInTopX = (topX: number) => {
    if (!cardListData || !decks.length) return [];

    // Get all decks in top X
    const topDecks = decks.filter(
      deck => deck.tournamentDeck.placement !== null && deck.tournamentDeck.placement <= topX,
    );

    // Filter decks with the same key
    const matchingDecks = topDecks.filter(deck =>
      getDeckKeys(deck, metaInfo, cardListData)?.includes(key),
    );

    // Sort by placement
    const sortedDecks = [...matchingDecks].sort((a, b) => {
      const placementA = a.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      const placementB = b.tournamentDeck.placement || Number.MAX_SAFE_INTEGER;
      return placementA - placementB;
    });

    // Return up to 10 decks
    return sortedDecks.slice(0, 10);
  };

  const addDecksToComparer = (
    decksToAdd: typeof decks,
    context: 'top8' | 'top16' | 'all',
    newTab: boolean,
  ) => {
    // Clear any previous warnings
    setWarning(null);

    // Check if we have enough decks to compare
    if (decksToAdd.length === 0) {
      if (context === 'top8') {
        setWarning('No decks with this key in top 8');
      } else if (context === 'top16') {
        setWarning('No decks with this key in top 16');
      } else {
        setWarning('No decks with this key in whole analysis');
      }
      return;
    }

    if (decksToAdd.length === 1) {
      if (context === 'top8') {
        setWarning('Only one deck with this key in top 8, nothing to compare with');
      } else if (context === 'top16') {
        setWarning('Only one deck with this key in top 16, nothing to compare with');
      } else {
        setWarning('Only one deck with this key in whole analysis, nothing to compare with');
      }
      return;
    }

    // Clear existing entries
    clearComparerEntries();

    // Add each deck to comparer
    decksToAdd.forEach(deck => {
      if (!deck.deck?.id) return;

      addComparerEntry({
        id: deck.deck.id,
        dataType: 'deck',
        additionalData: {
          title: deck.deck.name,
          leader1: deck.deck.leaderCardId1 ?? undefined,
          leader2: deck.deck.leaderCardId2 ?? undefined,
          base: deck.deck.baseCardId ?? undefined,
        },
      });
    });

    // Navigate to comparer page
    if (newTab) {
      window.open('/comparer', '_blank');
    } else {
      navigate({ to: '/comparer' });
    }
  };

  let csLeaderId = key;
  let csBaseId = undefined;
  let csPage = 'leader';
  if (metaInfo === 'leadersAndBase') {
    [csLeaderId, csBaseId] = key.split('|');
    csPage = 'leader-base';
  }

  const searchParamsOnly =
    route === MetaRoute || route === RootRoute || route === PlanetaryQualifiersRoute;

  return (
    <Card className="fixed bottom-4 right-4 w-[300px] border">
      <CardHeader className="p-4 pb-0">
        <div className="w-full flex gap-4 justify-between items-center">
          {labelRenderer(key, metaInfo, 'compact', 'left')}
          <Button variant="outline" size="iconSmall" onClick={() => setTournamentDeckKey({})}>
            <X />
          </Button>
        </div>
        <div className="w-full flex gap-4 justify-between items-center">
          <Button size="xs" className="btn btn-primary" asChild>
            {searchParamsOnly ? (
              <Link
                to="."
                search={prev => ({
                  ...prev,
                  page: 'decks',
                  maDeckKey: key,
                  maDeckKeyType: metaInfo,
                })}
              >
                Show decks
              </Link>
            ) : (
              // @ts-ignore
              <Link
                to={'/tournaments/$tournamentId/decks'}
                search={prev => ({ ...prev, maDeckKey: key, maDeckKeyType: metaInfo })}
              >
                Show decks
              </Link>
            )}
          </Button>
          {(metaInfo === 'leaders' || metaInfo === 'leadersAndBase') && (
            <Button size="xs" className="btn btn-primary" asChild>
              {searchParamsOnly ? (
                <Link
                  to="."
                  search={prev => ({
                    ...prev,
                    page: 'card-stats',
                    csPage,
                    csLeaderId,
                    csBaseId,
                  })}
                >
                  Show card statistics
                </Link>
              ) : (
                // @ts-ignore
                <Link
                  to={'/tournaments/$tournamentId/card-stats'}
                  search={prev => ({ ...prev, csLeaderId, csBaseId, csPage })}
                >
                  Show card statistics
                </Link>
              )}
            </Button>
          )}
        </div>

        {/* Comparer Section */}
        <div className="mt-2 border-t pt-2">
          <Accordion
            type="single"
            collapsible
            value={accordionValue}
            onValueChange={handleAccordionValueChange}
            className="w-full"
          >
            <AccordionItem value="comparer" className="border-none">
              <AccordionTrigger className="p-0 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Scale className="size-5" />
                  <span className="font-medium">Comparer actions</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {/* Warning message */}
                {warning && (
                  <div className="flex items-center gap-2 p-2 mb-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">{warning}</span>
                  </div>
                )}

                {/* Best placements */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Best placements:</span>
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onMouseDown={e =>
                        addDecksToComparer(findDecksByPlacement(5), 'all', e.button === 1)
                      }
                      onTouchStart={() => addDecksToComparer(findDecksByPlacement(5), 'all', true)}
                    >
                      5
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onMouseDown={e =>
                        addDecksToComparer(findDecksByPlacement(10), 'all', e.button === 1)
                      }
                      onTouchStart={() => addDecksToComparer(findDecksByPlacement(10), 'all', true)}
                    >
                      10
                    </Button>
                  </div>
                </div>

                {/* Only decks in top X */}
                <div className="flex justify-between items-center">
                  <span className="text-sm">Only decks in top X:</span>
                  <div className="flex gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onMouseDown={e =>
                        addDecksToComparer(findDecksInTopX(8), 'top8', e.button === 1)
                      }
                      onTouchStart={() => addDecksToComparer(findDecksInTopX(8), 'top8', true)}
                    >
                      Top 8
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onMouseDown={e =>
                        addDecksToComparer(findDecksInTopX(16), 'top16', e.button === 1)
                      }
                      onTouchStart={() => addDecksToComparer(findDecksInTopX(16), 'top16', true)}
                    >
                      Top 16
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardHeader>
    </Card>
  );
};

export default TournamentDeckKeyFloater;
