import type { Deck } from '../../../types/Deck.ts';
import type { User } from '../../../types/User.ts';
import type { DeckCard } from '../../../types/ZDeckCard.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from '../cards/selectDefaultVariant.ts';

export interface DeckExportJSONCard {
  id: string;
  count: number;
}

export interface DeckExportJSON {
  metadata: {
    name: string;
    author: string;
  };
  leader?: DeckExportJSONCard;
  leader2?: DeckExportJSONCard;
  base?: DeckExportJSONCard;
  deck: DeckExportJSONCard[];
  sideboard: DeckExportJSONCard[];
}

/**
 * Format a deck for JSON export
 */
export function createDeckJsonExport(
  deck: Deck,
  deckCards: DeckCard[],
  user: User,
  cardList: CardList,
): DeckExportJSON {
  // Group cards by board and transform
  const mainboardCards = deckCards
    .filter(card => card.board === 1)
    .map(card => ({
      id: formatCardId(card.cardId, cardList),
      count: card.quantity,
    }));

  const sideboardCards = deckCards
    .filter(card => card.board === 2)
    .map(card => ({
      id: formatCardId(card.cardId, cardList),
      count: card.quantity,
    }));

  // Create export object
  // Remove text in brackets from the deck name
  // This regex specifically targets the last bracket section at the end of the string
  const cleanedDeckName = deck.name.replace(/\s*\[[^\[\]]*\]\s*$/, '');
  
  const exportData: DeckExportJSON = {
    metadata: {
      name: cleanedDeckName,
      author: user.displayName,
    },
    deck: mainboardCards,
    sideboard: sideboardCards,
  };

  // Add leader if exists
  if (deck.leaderCardId1) {
    exportData.leader = {
      id: formatCardId(deck.leaderCardId1, cardList),
      count: 1,
    };
  }

  // Add second leader if exists
  if (deck.leaderCardId2) {
    exportData.leader2 = {
      id: formatCardId(deck.leaderCardId2, cardList),
      count: 1,
    };
  }

  // Add base if exists
  if (deck.baseCardId) {
    exportData.base = {
      id: formatCardId(deck.baseCardId, cardList),
      count: 1,
    };
  }

  return exportData;
}

/**
 * Format a deck for plain text export
 */
export function createDeckTextExport(
  deck: Deck,
  deckCards: DeckCard[],
  cardList: CardList,
): string {
  let text = '';

  // Leader section
  if (deck.leaderCardId1 || deck.leaderCardId2) {
    text += 'Leaders\n';

    if (deck.leaderCardId1) {
      const card = cardList[deck.leaderCardId1];
      if (card) {
        // Get the subtitle part if it exists (after the comma)
        const nameParts = card.name.split(', ');
        if (nameParts.length > 1) {
          text += `1 | ${nameParts[0]} | ${nameParts[1]}\n`;
        } else {
          text += `1 | ${card.name}\n`;
        }
      } else {
        text += `1 | ${deck.leaderCardId1}\n`;
      }
    }

    if (deck.leaderCardId2) {
      const card = cardList[deck.leaderCardId2];
      if (card) {
        // Get the subtitle part if it exists (after the comma)
        const nameParts = card.name.split(', ');
        if (nameParts.length > 1) {
          text += `1 | ${nameParts[0]} | ${nameParts[1]}\n`;
        } else {
          text += `1 | ${card.name}\n`;
        }
      } else {
        text += `1 | ${deck.leaderCardId2}\n`;
      }
    }

    text += '\n';
  }

  // Base section
  if (deck.baseCardId) {
    const baseCard = cardList[deck.baseCardId];
    text += 'Base\n';
    if (baseCard) {
      text += `1 | ${baseCard.name}\n\n`;
    } else {
      text += `1 | ${deck.baseCardId}\n\n`;
    }
  }

  // Main deck section
  const mainDeckCards = deckCards.filter(card => card.board === 1);
  if (mainDeckCards.length > 0) {
    text += 'Deck\n';
    mainDeckCards.forEach(card => {
      const cardData = cardList[card.cardId];
      if (cardData) {
        // Get the subtitle part if it exists (after the comma)
        const nameParts = cardData.name.split(', ');
        if (nameParts.length > 1) {
          text += `${card.quantity} | ${nameParts[0]} | ${nameParts[1]}\n`;
        } else {
          text += `${card.quantity} | ${cardData.name}\n`;
        }
      } else {
        text += `${card.quantity} | ${card.cardId}\n`;
      }
    });
    text += '\n';
  }

  // Sideboard section
  const sideboardCards = deckCards.filter(card => card.board === 2);
  if (sideboardCards.length > 0) {
    text += 'Sideboard\n';
    sideboardCards.forEach(card => {
      const cardData = cardList[card.cardId];
      if (cardData) {
        // Get the subtitle part if it exists (after the comma)
        const nameParts = cardData.name.split(', ');
        if (nameParts.length > 1) {
          text += `${card.quantity} | ${nameParts[0]} | ${nameParts[1]}\n`;
        } else {
          text += `${card.quantity} | ${cardData.name}\n`;
        }
      } else {
        text += `${card.quantity} | ${card.cardId}\n`;
      }
    });
    text += '\n';
  }

  return text.trim();
}

/**
 * Helper function to format card ID to preferred format (e.g., SOR_092 instead of internal ID)
 * If the card ID is already in the preferred format, it's returned as is
 */
function formatCardId(cardId: string, cardList: CardList): string {
  const card = cardList[cardId];
  if (!card) return cardId; // Return original if not found

  // For each card, find the primary (Standard) variant and use its set code and card number
  const primaryVariantId = selectDefaultVariant(card);
  const primaryVariant = primaryVariantId ? card.variants[primaryVariantId] : undefined;

  if (primaryVariant) {
    const setCode = primaryVariant.set.toUpperCase();
    const cardNumber = primaryVariant.cardNo.toString().padStart(3, '0');
    return `${setCode}_${cardNumber}`;
  }

  return cardId; // Fallback to original ID
}

/**
 * Format card ID to preferred format (e.g. SOR_092)
 */
export function formatCardIdFromCard(
  cardId: string,
  card: CardDataWithVariants<CardListVariants> | undefined,
): string {
  if (!card || !card.variants) return cardId;

  // Find the primary variant
  const variantIds = Object.keys(card.variants);
  if (variantIds.length === 0) return cardId;

  // Try to find standard variant first
  let primaryVariantId = null;
  for (const id of variantIds) {
    const variant = card.variants[id];
    if (variant && variant.variantName === 'Standard') {
      primaryVariantId = id;
      break;
    }
  }

  // If no standard variant found, use the first one
  if (!primaryVariantId) {
    primaryVariantId = variantIds[0];
  }

  const primaryVariant = card.variants[primaryVariantId];

  if (primaryVariant) {
    const setCode = primaryVariant.set.toUpperCase();
    const cardNumber = primaryVariant.cardNo.toString().padStart(3, '0');
    return `${setCode}_${cardNumber}`;
  }

  return cardId;
}

/**
 * Utility function to download data as a file
 */
export function downloadAsFile(data: string, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
