import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';
import { ExternalLink, Trophy } from 'lucide-react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import CardImage from '@/components/app/global/CardImage';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant';
import { extractDeckNameFromBrackets } from '../../lib/extractDeckNameFromBrackets';
import { BracketInfo } from '../../../../../../../types/enums.ts';

interface PlacementGroup {
  placement: string;
  decks: TournamentDeckResponse[];
}

interface TournamentPlacementsProps {
  topDecks: TournamentDeckResponse[];
  top: BracketInfo;
  highlightedPlayer: string | null;
  setHighlightedPlayer: (username: string | null) => void;
  selectedDeckId: string | undefined;
  setSelectedDeckId: (deckId: string | undefined) => void;
  cardListData: any;
}

const TournamentPlacements: React.FC<TournamentPlacementsProps> = ({
  topDecks,
  top,
  highlightedPlayer,
  setHighlightedPlayer,
  selectedDeckId,
  setSelectedDeckId,
  cardListData,
}) => {
  // Create structured placements for the sidebar
  const placements = React.useMemo(() => {
    if (!topDecks.length) return [];

    const result: PlacementGroup[] = [];

    // For "none" bracket type, show a flat list of up to 8 decks without placement groupings
    if (top === BracketInfo.NONE) {
      // Take up to 8 decks
      const limitedDecks = topDecks.slice(0, 8);
      if (limitedDecks.length) {
        result.push({
          placement: '', // No placement label
          decks: limitedDecks,
        });
      }
      return result;
    }

    // Winner (1st place)
    if (topDecks[0]) {
      result.push({
        placement: '1st',
        decks: [topDecks[0]],
      });
    }

    // Runner-up (2nd place)
    if (topDecks.length > 1 && topDecks[1]) {
      result.push({
        placement: '2nd',
        decks: [topDecks[1]],
      });
    }

    // 3rd-4th places
    const thirdFourthDecks = topDecks.filter(
      d => d.tournamentDeck.placement === 3 || d.tournamentDeck.placement === 4,
    );
    if (thirdFourthDecks.length) {
      result.push({
        placement: '3rd-4th',
        decks: thirdFourthDecks,
      });
    }

    // 5th-8th places if top 8 or top 16
    if (top === BracketInfo.TOP8 || top === BracketInfo.TOP16) {
      const fifthToEighthDecks = topDecks.filter(
        d => (d.tournamentDeck.placement ?? 0) >= 5 && (d.tournamentDeck.placement ?? 0) <= 8,
      );
      if (fifthToEighthDecks.length) {
        result.push({
          placement: '5th-8th',
          decks: fifthToEighthDecks,
        });
      }
    }

    // 9th-16th places if top 16
    if (top === BracketInfo.TOP16) {
      const ninthToSixteenthDecks = topDecks.filter(
        d => (d.tournamentDeck.placement ?? 0) >= 9 && (d.tournamentDeck.placement ?? 0) <= 16,
      );
      if (ninthToSixteenthDecks.length) {
        result.push({
          placement: '9th-16th',
          decks: ninthToSixteenthDecks,
        });
      }
    }

    return result;
  }, [topDecks, top]);

  return (
    <div className="min-w-72 space-y-4 mr-6">
      <h3 className="text-lg font-bold">Final Standings</h3>
      {placements.map((placementGroup, index) => (
        <div key={index} className="space-y-2">
          {placementGroup.placement && (
            <h4 className="text-sm font-semibold text-muted-foreground">
              {placementGroup.placement}
            </h4>
          )}
          {placementGroup.decks.map(deck => {
            const username = deck.tournamentDeck.meleePlayerUsername || 'Unknown';
            const isHighlighted =
              highlightedPlayer === username || selectedDeckId === deck.tournamentDeck.deckId;

            // Get leader and base card info
            const leaderCard = deck.deck?.leaderCardId1
              ? cardListData?.cards[deck.deck.leaderCardId1]
              : undefined;
            const baseCard = deck.deck?.baseCardId
              ? cardListData?.cards[deck.deck.baseCardId]
              : undefined;

            return (
              <div
                key={deck.tournamentDeck.deckId}
                className={cn(
                  'p-2 rounded-md transition-colors border flex gap-2 items-center cursor-pointer',
                  isHighlighted
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500'
                    : 'hover:bg-muted/50 border-transparent',
                )}
                onMouseEnter={() => setHighlightedPlayer(username)}
                onMouseLeave={() => setHighlightedPlayer(null)}
                onClick={() => setSelectedDeckId(deck.tournamentDeck.deckId)}
              >
                <div className="flex gap-1 flex-shrink-0">
                  {leaderCard && (
                    <CardImage
                      card={leaderCard}
                      cardVariantId={leaderCard ? selectDefaultVariant(leaderCard) : undefined}
                      forceHorizontal={true}
                      size="w50"
                      backSideButton={false}
                    />
                  )}
                  {baseCard && (
                    <div className="-ml-2">
                      <CardImage
                        card={baseCard}
                        cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
                        forceHorizontal={true}
                        size="w50"
                        backSideButton={false}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center overflow-hidden">
                  <div className="font-medium">
                    {top === BracketInfo.NONE && deck.tournamentDeck.placement 
                      ? `#${deck.tournamentDeck.placement} ${username}`
                      : username
                    }
                    {deck.tournamentDeck.placement === 1 && (
                      <Trophy className="h-4 w-4 text-amber-500 inline ml-2" />
                    )}
                  </div>
                  {deck.deck && deck.deck.name && (
                    <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-32">
                      {extractDeckNameFromBrackets(deck.deck.name)}
                    </div>
                  )}
                </div>
                {deck.deck && deck.deck.id && (
                  <Button size="iconSmall" variant="outline" title="Open deck in new tab">
                    <Link to={'/decks/$deckId'} params={{ deckId: deck.deck.id }} target="_blank">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default TournamentPlacements;
