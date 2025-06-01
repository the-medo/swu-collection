import type { TournamentDeck } from '../server/db/schema/tournament_deck.ts';
import type { Deck } from '../server/db/schema/deck.ts';
import type { DeckInformation } from '../server/db/schema/deck_information.ts';
import type { DeckCard } from '../server/db/schema/deck_card.ts';

export type CardDeckData = {
  tournamentDeck: TournamentDeck;
  deck: Deck;
  deckInformation: DeckInformation;
  deckCard: DeckCard;
};
