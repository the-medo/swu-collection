import React from 'react';
import { TournamentGroupTournament as TournamentGroupTournamentType } from '../../../../../../types/TournamentGroup';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import DeckPlacement from '../components/DeckPlacement';

interface TournamentGroupTournamentProps {
  tournamentItem: TournamentGroupTournamentType;
}

const TournamentGroupTournament: React.FC<TournamentGroupTournamentProps> = ({
  tournamentItem,
}) => {
  const { tournament, deck, tournamentDeck } = tournamentItem;
  const { data: countryData } = useCountryList();
  const { data: cardList } = useCardList();

  // Construct the thumbnail URL
  const thumbnailUrl = `https://images.swubase.com/tournament/${tournament.id}.webp`;

  // Get country data
  const countryCode = tournament.continent as CountryCode;
  const country = countryData?.countries[countryCode];

  // Get card data for the deck
  const leader1 = deck.leaderCardId1 && cardList ? cardList.cards[deck.leaderCardId1] : undefined;
  const leader2 = deck.leaderCardId2 && cardList ? cardList.cards[deck.leaderCardId2] : undefined;
  const base = deck.baseCardId && cardList ? cardList.cards[deck.baseCardId] : undefined;

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block h-full">
      <Card className="overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={tournament.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
            onError={e => {
              // Fallback if image fails to load
              e.currentTarget.src = 'https://placehold.co/600x400?text=No+Image';
            }}
          />

          {/* Winning Deck - positioned at the bottom of the image */}
          {cardList && leader1 && (
            <div className="absolute bottom-0 left-[50%] transform -translate-x-1/2 from-black/80 to-transparent">
              <DeckPlacement
                leaderCard1={leader1}
                leaderCard2={leader2}
                baseCard={base}
                className="bg-transparent w-[150px]"
                cardImageSize="w75"
              />
            </div>
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          <h4 className="font-semibold text-lg mb-2 line-clamp-2">{tournament.name}</h4>

          <div className="mt-auto flex flex-row justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span>{tournament.attendance}</span>
            </div>

            <div className="flex items-center gap-1">
              {country && <img src={country.flag} alt={country.code} className="w-4 h-4" />}
              <span>{tournament.location}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default TournamentGroupTournament;
