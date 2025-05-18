import { db } from '../../db';
import { tournament } from '../../db/schema/tournament';
import { deck } from '../../db/schema/deck';
import { eq } from 'drizzle-orm';
import { cardList } from '../../db/lists.ts';

export async function getTournamentMetaTags(tournamentId: string) {
  try {
    const tournamentData = (
      await db.select().from(tournament).where(eq(tournament.id, tournamentId))
    )[0];

    if (!tournamentData) {
      return null;
    }

    return {
      'og:title': `${tournamentData.name} - SWU Base Tournament`,
      'og:description': `${tournamentData.location} tournament with ${tournamentData.attendance} players`,
      'og:image': 'https://images.swubase.com/tournament-default.png',
      'og:url': `https://swubase.com/tournaments/${tournamentId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching tournament meta tags:', error);
    return null;
  }
}

export async function getDeckMetaTags(deckId: string) {
  try {
    const deckData = (await db.select().from(deck).where(eq(deck.id, deckId)))[0];

    if (!deckData || !deckData.leaderCardId1 || !deckData.baseCardId || !deckData.public) {
      return null;
    }

    const leaderCard = cardList[deckData.leaderCardId1];
    const baseCard = cardList[deckData.baseCardId];

    return {
      'og:title': `${deckData.name} - SWU Base Deck`,
      'og:description': `${leaderCard?.name} [${baseCard?.name}] - ${deckData.description || 'View deck details, cards, and statistics'}`,
      'og:image': `https://images.swubase.com/decks/${deckData.leaderCardId1}_${deckData.baseCardId}.webp`,
      'og:url': `https://swubase.com/decks/${deckId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching deck meta tags:', error);
    return null;
  }
}
