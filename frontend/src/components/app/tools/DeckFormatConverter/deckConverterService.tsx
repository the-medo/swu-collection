import { CardList } from '../../../../../../lib/swu-resources/types.ts';
import { DeckExportJSON, DeckExportJSONCard, formatCardIdFromCard } from '@/lib/deck/deckExport.ts';
import { DeckCard } from '../../../../../../types/ZDeckCard.ts';

interface ParsedSection {
  name: string;
  cards: { id: string; count: number; name: string }[];
}

export function parseMeleeToText(text: string): string {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return lines
    .map(l => {
      if (l === 'MainDeck') return 'Deck';
      if (l === 'Leader') return 'Leaders';

      const spl = l.split(' ');
      if (spl.length > 1) {
        const count = parseInt(spl[0], 10);
        const cardName = spl.slice(1).join(' ');
        return `${count} | ${cardName}`;
      }
      return l;
    })
    .join('\n');
}

/**
 * Parses a text-based deck list into a structured JSON format
 */
export function parseTextToJson(
  text: string,
  cardList: CardList,
  deckName: string = 'Imported Deck',
  author: string = 'Anonymous',
): [DeckExportJSON, ParsedSection] {
  if (!cardList) {
    throw new Error('Card data is not loaded yet. Please try again in a moment.');
  }

  // Split the text into lines and remove empty ones
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  const unmatchedSection: ParsedSection = {
    name: 'Unmatched',
    cards: [],
  };
  let currentSection: ParsedSection | null = null;

  // Parse the text line by line
  for (const line of lines) {
    // Check if this is a section header (a line without numbers or pipe characters)
    const sectionMatch = line.match(/^[^0-9|]*$/i);

    if (sectionMatch && !line.includes('|')) {
      // Start a new section
      currentSection = { name: line.trim(), cards: [] };
      sections.push(currentSection);
      continue;
    }

    // If we don't have a current section, create a default one
    if (!currentSection) {
      currentSection = { name: 'Deck', cards: [] };
      sections.push(currentSection);
    }

    // Parse card line (expecting format like "2 | Card Name | Subtitle" or "2 | Card Name")
    const cardParts = line.split('|').map(part => part.trim());

    if (cardParts.length >= 2) {
      const countStr = cardParts[0];
      let cardName = cardParts[1];

      // If there's a subtitle, add it to the card name
      if (cardParts.length > 2) {
        cardName = `${cardName}, ${cardParts[2]}`;
      }

      // Extract count (default to 1 if not a number)
      const count = parseInt(countStr, 10) || 1;

      // Find the card in the card list
      const cardId = findCardId(cardName, cardList);

      if (cardId) {
        currentSection.cards.push({
          id: cardId,
          count,
          name: cardName,
        });
      } else {
        console.warn(`Card not found: ${cardName}`);
        // Still add it with the raw name as the ID to not lose information
        unmatchedSection.cards.push({
          id: cardName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          count,
          name: cardName,
        });
      }
    }
  }

  // Map sections to the expected output format
  let leader: DeckExportJSONCard | undefined;
  let leader2: DeckExportJSONCard | undefined;
  let base: DeckExportJSONCard | undefined;
  const deck: DeckExportJSONCard[] = [];
  const sideboard: DeckExportJSONCard[] = [];

  sections.forEach(section => {
    const sectionName = section.name.toLowerCase();

    if (sectionName.includes('leader')) {
      // First leader found goes to leader, second to leader2
      if (!leader && section.cards.length > 0) {
        leader = { id: section.cards[0].id, count: 1 };

        // If there's a second leader in this section
        if (section.cards.length > 1) {
          leader2 = { id: section.cards[1].id, count: 1 };
        }
      } else if (leader && !leader2 && section.cards.length > 0) {
        leader2 = { id: section.cards[0].id, count: 1 };
      }
    } else if (sectionName.includes('base') && section.cards.length > 0) {
      base = { id: section.cards[0].id, count: 1 };
    } else if (sectionName.includes('sideboard') || sectionName.includes('side')) {
      section.cards.forEach(card => {
        sideboard.push({ id: card.id, count: card.count });
      });
    } else if (sectionName.includes('maybe')) {
      // Maybe board is not included in the export format
      console.info('Maybe board entries will not be included in export');
    } else {
      // Default to main deck
      section.cards.forEach(card => {
        deck.push({ id: card.id, count: card.count });
      });
    }
  });

  return [
    {
      metadata: {
        name: deckName,
        author: author,
      },
      ...(leader && { leader }),
      ...(leader2 && { leader2 }),
      ...(base && { base }),
      deck,
      sideboard,
    },
    unmatchedSection,
  ];
}

/**
 * Parses a text-based deck list into our format
 */
export function parseTextToSwubase(
  text: string,
  cardList: CardList,
  deckId: string,
): {
  deckCards: DeckCard[];
  leader1: string;
  leader2: string | undefined;
  base: string;
} {
  if (!cardList) {
    throw new Error('Card data is not loaded yet. Please try again in a moment.');
  }

  // Split the text into lines and remove empty ones
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  const unmatchedSection: ParsedSection = {
    name: 'Unmatched',
    cards: [],
  };
  let currentSection: ParsedSection | null = null;

  // Parse the text line by line
  for (const line of lines) {
    // Check if this is a section header (a line without numbers or pipe characters)
    const sectionMatch = line.match(/^[^0-9|]*$/i);

    if (sectionMatch && !line.includes('|')) {
      // Start a new section
      currentSection = { name: line.trim(), cards: [] };
      sections.push(currentSection);
      continue;
    }

    // If we don't have a current section, create a default one
    if (!currentSection) {
      currentSection = { name: 'Deck', cards: [] };
      sections.push(currentSection);
    }

    // Parse card line (expecting format like "2 | Card Name | Subtitle" or "2 | Card Name")
    const cardParts = line.split('|').map(part => part.trim());

    if (cardParts.length >= 2) {
      const countStr = cardParts[0];
      let cardName = cardParts[1];

      // If there's a subtitle, add it to the card name
      if (cardParts.length > 2) {
        cardName = `${cardName}, ${cardParts[2]}`;
      }

      // Extract count (default to 1 if not a number)
      const count = parseInt(countStr, 10) || 1;

      // Find the card in the card list
      const cardId = findCardId(cardName, cardList, true);

      if (cardId) {
        currentSection.cards.push({
          id: cardId,
          count,
          name: cardName,
        });
      } else {
        console.warn(`Card not found: ${cardName}`);
        // Still add it with the raw name as the ID to not lose information
        unmatchedSection.cards.push({
          id: cardName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          count,
          name: cardName,
        });
      }
    }
  }

  // Map sections to the expected output format
  let leader1: string = '';
  let leader2: string | undefined = undefined;
  let base: string = '';
  const result: DeckCard[] = [];

  sections.forEach(section => {
    const sectionName = section.name.toLowerCase();

    if (sectionName.includes('leader')) {
      // First leader found goes to leader, second to leader2
      if (!leader1 && section.cards.length > 0) {
        leader1 = section.cards[0].id;

        // If there's a second leader in this section
        if (section.cards.length > 1) {
          leader2 = section.cards[1].id;
        }
      } else if (leader1 && !leader2 && section.cards.length > 0) {
        leader2 = section.cards[0].id;
      }
    } else if (sectionName.includes('base') && section.cards.length > 0) {
      base = section.cards[0].id;
    } else if (sectionName.includes('sideboard') || sectionName.includes('side')) {
      section.cards.forEach(card => {
        result.push({
          deckId,
          cardId: card.id,
          board: 2,
          quantity: card.count,
        });
      });
    } else if (sectionName.includes('maybe')) {
      // Maybe board is not included in the export format
      console.info('Maybe board entries will not be included in export');
    } else {
      // Default to main deck
      section.cards.forEach(card => {
        result.push({
          deckId,
          cardId: card.id,
          board: 1,
          quantity: card.count,
        });
      });
    }
  });

  return {
    leader1,
    leader2,
    base,
    deckCards: result,
  };
}

/**
 * Finds a card ID in the card list based on the card name
 */
export function findCardId(
  cardName: string,
  cardList: CardList,
  useSwubaseId = false,
): string | null {
  // Normalize the search name
  const searchName = cardName.toLowerCase();

  // First try direct match
  for (const cardId in cardList) {
    const card = cardList[cardId];
    if (card && card.name.toLowerCase() === searchName) {
      if (useSwubaseId) return cardId;
      return formatCardIdFromCard(cardId, card);
    }
  }

  // Then try partial match (only considering the name part before comma)
  const nameParts = searchName.split(',');
  const nameBeforeComma = nameParts[0].trim();

  for (const cardId in cardList) {
    const card = cardList[cardId];
    if (card) {
      const cardNameParts = card.name.toLowerCase().split(',');
      const cardNameBeforeComma = cardNameParts[0].trim();

      if (cardNameBeforeComma === nameBeforeComma) {
        if (useSwubaseId) return cardId;
        return formatCardIdFromCard(cardId, card);
      }
    }
  }

  // Lastly try a more fuzzy match
  for (const cardId in cardList) {
    const card = cardList[cardId];
    if (card && card.name.toLowerCase().includes(nameBeforeComma)) {
      if (useSwubaseId) return cardId;
      return formatCardIdFromCard(cardId, card);
    }
  }

  return null;
}
