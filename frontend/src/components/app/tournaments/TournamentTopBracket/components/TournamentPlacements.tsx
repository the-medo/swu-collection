import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import { extractDeckNameFromBrackets } from '../../lib/extractDeckNameFromBrackets';
import { BracketInfo } from '../../../../../../../types/enums.ts';
import DeckPlacement from '@/components/app/tournaments/components/DeckPlacement.tsx';

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
              <div key={deck.tournamentDeck.deckId}>
                <DeckPlacement
                  leaderCard1={leaderCard}
                  baseCard={baseCard}
                  username={username}
                  deckName={
                    deck.deck?.name ? extractDeckNameFromBrackets(deck.deck.name) : undefined
                  }
                  placement={deck.tournamentDeck.placement ?? undefined}
                  showPlacement={top === BracketInfo.NONE}
                  isHighlighted={isHighlighted}
                  onClick={() => setSelectedDeckId(deck.tournamentDeck.deckId)}
                  onMouseEnter={() => setHighlightedPlayer(username)}
                  onMouseLeave={() => setHighlightedPlayer(null)}
                  deckId={deck.deck?.id}
                  showDeckLink={!!deck.deck?.id}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default TournamentPlacements;
