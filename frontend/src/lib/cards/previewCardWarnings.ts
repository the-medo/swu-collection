import { selectDefaultVariant } from '../../../../server/lib/cards/selectDefaultVariant.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../../../../lib/swu-resources/types.ts';
import type { Deck } from '../../../../types/Deck.ts';
import type { DeckCard } from '../../../../types/ZDeckCard.ts';

export type PreviewCardExportStatus = {
  cardId: string;
  name: string;
  hasKarabastId: boolean;
  hasSetNumber: boolean;
  hasReliableExportId: boolean;
};

export type DeckPreviewCardSummary = {
  cards: PreviewCardExportStatus[];
  hasPreviewCards: boolean;
  hasKarabastIds: boolean;
  hasOnlySetNumbers: boolean;
  missingReliableExportIds: PreviewCardExportStatus[];
};

export function getPreviewCardExportStatus(
  card: CardDataWithVariants<CardListVariants>,
): PreviewCardExportStatus {
  const defaultVariantId = selectDefaultVariant(card);
  const defaultVariant = defaultVariantId ? card.variants[defaultVariantId] : undefined;
  const hasKarabastId = !!card.karabast_id?.trim();
  const hasSetNumber = !!defaultVariant?.set && (defaultVariant?.cardNo ?? 0) > 0;

  return {
    cardId: card.cardId,
    name: card.name,
    hasKarabastId,
    hasSetNumber,
    hasReliableExportId: hasKarabastId || hasSetNumber,
  };
}

export function collectDeckPreviewCards(
  deck: Deck | undefined,
  deckCards: DeckCard[] | undefined,
  cardList: CardList | undefined,
): DeckPreviewCardSummary {
  const previewCardsById = new Map<string, PreviewCardExportStatus>();

  const addCard = (cardId: string | null | undefined) => {
    if (!cardId || !cardList) return;

    const card = cardList[cardId];
    if (!card?.preview) return;

    previewCardsById.set(cardId, getPreviewCardExportStatus(card));
  };

  addCard(deck?.leaderCardId1);
  addCard(deck?.leaderCardId2);
  addCard(deck?.baseCardId);
  deckCards?.forEach(deckCard => {
    if (deckCard.quantity > 0) addCard(deckCard.cardId);
  });

  const cards = Array.from(previewCardsById.values()).sort((a, b) => a.name.localeCompare(b.name));
  const missingReliableExportIds = cards.filter(card => !card.hasReliableExportId);

  return {
    cards,
    hasPreviewCards: cards.length > 0,
    hasKarabastIds: cards.some(card => card.hasKarabastId),
    hasOnlySetNumbers: cards.some(card => !card.hasKarabastId && card.hasSetNumber),
    missingReliableExportIds,
  };
}

export function summarizePreviewCards(
  cards: Array<CardDataWithVariants<CardListVariants> | null | undefined>,
): DeckPreviewCardSummary {
  const previewCardsById = new Map<string, PreviewCardExportStatus>();

  cards.forEach(card => {
    if (!card?.preview) return;
    previewCardsById.set(card.cardId, getPreviewCardExportStatus(card));
  });

  const previewCards = Array.from(previewCardsById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const missingReliableExportIds = previewCards.filter(card => !card.hasReliableExportId);

  return {
    cards: previewCards,
    hasPreviewCards: previewCards.length > 0,
    hasKarabastIds: previewCards.some(card => card.hasKarabastId),
    hasOnlySetNumbers: previewCards.some(card => !card.hasKarabastId && card.hasSetNumber),
    missingReliableExportIds,
  };
}

export function getPreviewDeckWarningText(summary: DeckPreviewCardSummary): string | undefined {
  if (!summary.hasPreviewCards) return undefined;

  const cardLabel = summary.cards.length === 1 ? 'preview card' : 'preview cards';
  const parts = [`This deck contains ${summary.cards.length} ${cardLabel}.`];

  if (summary.hasKarabastIds) {
    parts.push('Karabast JSON export uses preview IDs where available.');
  }

  if (summary.hasOnlySetNumbers) {
    parts.push('Cards without preview IDs export with provisional set/card numbers.');
  }

  if (summary.missingReliableExportIds.length > 0) {
    const missingNames = summary.missingReliableExportIds.map(card => card.name).join(', ');
    parts.push(`Missing export IDs for: ${missingNames}.`);
  }

  return parts.join(' ');
}
