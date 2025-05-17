import { db } from '../../db';
import { tournament } from '../../db/schema/tournament';
import { deck } from '../../db/schema/deck';
import { eq } from 'drizzle-orm';

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

    if (!deckData) {
      return null;
    }

    return {
      'og:title': `${deckData.name} - SWU Base Deck`,
      'og:description': deckData.description || 'View deck details, cards, and statistics',
      'og:image': 'https://images.swubase.com/deck-default.png',
      'og:url': `https://swubase.com/decks/${deckId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching deck meta tags:', error);
    return null;
  }
}
