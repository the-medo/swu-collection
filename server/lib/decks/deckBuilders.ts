import type { CardList } from '../../../lib/swu-resources/types.ts';
import type { DeckCard } from '../../../types/ZDeckCard.ts';
import {
  deckBuilderSources,
  type DeckBuilderSource,
  zDeckBuilderSource,
} from '../../../types/DeckImport.ts';
import { z } from 'zod';
import { parseHTML } from 'linkedom';
import { readMeleeDecklistText } from '../imports/meleeDecklist.ts';
import { parseTextToSwubase } from './deckConverterService.tsx';

const zExternalDeckCard = z.object({
  id: z.string().min(1),
  count: z.coerce.number().int().positive(),
});

const zExternalDeck = z.object({
  metadata: z
    .object({
      name: z.string().optional().default(''),
      author: z.string().optional().default(''),
    })
    .optional()
    .default({ name: '', author: '' }),
  leader: zExternalDeckCard.optional(),
  secondleader: zExternalDeckCard.nullish(),
  base: zExternalDeckCard.optional(),
  deck: z.array(zExternalDeckCard).optional().default([]),
  sideboard: z.array(zExternalDeckCard).optional().default([]),
});

type JsonExternalDeck = z.infer<typeof zExternalDeck>;
export type ExternalDeck =
  | JsonExternalDeck
  | { metadata: JsonExternalDeck['metadata']; text: string };

export type ParsedImportedDeck = {
  name: string;
  leaderCardId1: string | undefined;
  leaderCardId2: string | undefined;
  baseCardId: string | undefined;
  cards: Omit<DeckCard, 'deckId'>[];
  errors: string[];
};

export class DeckBuilderError extends Error {
  public constructor(
    message: string,
    public readonly status: 400 | 404 | 502,
  ) {
    super(message);
    this.name = 'DeckBuilderError';
  }
}

export abstract class DeckBuilder {
  public abstract readonly source: DeckBuilderSource;
  public abstract readonly displayName: string;
  protected abstract readonly hostnames: readonly string[];

  public matches(deckLink: string) {
    try {
      return this.hostnames.includes(
        new URL(deckLink).hostname.replace(/^www\./i, '').toLowerCase(),
      );
    } catch {
      return false;
    }
  }

  public getDeckId(deckLink: string): string {
    let url: URL;
    try {
      url = new URL(deckLink);
    } catch {
      throw new DeckBuilderError(`Enter a valid ${this.displayName} deck link.`, 400);
    }

    if (!this.hostnames.includes(url.hostname.replace(/^www\./i, '').toLowerCase())) {
      throw new DeckBuilderError(`Enter a valid ${this.displayName} deck link.`, 400);
    }

    const deckId = this.getDeckIdFromUrl(url);
    if (!deckId) {
      throw new DeckBuilderError(`Enter a valid ${this.displayName} deck link.`, 400);
    }

    return deckId;
  }

  public async fetchDeck(deckId: string): Promise<ExternalDeck> {
    return this.fetchJson(this.getApiUrl(deckId));
  }

  protected abstract getDeckIdFromUrl(url: URL): string | undefined;
  protected abstract getApiUrl(deckId: string): string;

  protected async fetchJson(apiUrl: string): Promise<ExternalDeck> {
    let response: Response;
    try {
      response = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new DeckBuilderError(`Unable to reach ${this.displayName}. Please try again.`, 502);
    }

    if (response.status === 404) {
      throw new DeckBuilderError(
        `Deck not found on ${this.displayName}. Make sure it is publicly shared.`,
        404,
      );
    }
    if (!response.ok) {
      throw new DeckBuilderError(
        `Unable to load the deck from ${this.displayName} (${response.status}).`,
        502,
      );
    }

    const payload = await response.json().catch(() => null);
    const parsed = zExternalDeck.safeParse(payload);
    if (!parsed.success) {
      throw new DeckBuilderError(`Invalid deck data returned by ${this.displayName}.`, 502);
    }

    return parsed.data;
  }
}

class SwudbDeckBuilder extends DeckBuilder {
  public readonly source = 'swudb' as const;
  public readonly displayName = 'SWUDB';
  protected readonly hostnames = ['swudb.com'];

  protected getDeckIdFromUrl(url: URL) {
    return matchPath(url, /^\/deck\/([^/]+)\/?$/i);
  }

  protected getApiUrl(deckId: string) {
    return `https://swudb.com/api/getDeckJson/${encodeURIComponent(deckId)}`;
  }
}

class SwuforgeDeckBuilder extends DeckBuilder {
  public readonly source = 'swuforge' as const;
  public readonly displayName = 'SWU Forge';
  protected readonly hostnames = ['swuforge.com'];

  protected getDeckIdFromUrl(url: URL) {
    return matchPath(url, /^\/decks\/([^/]+)\/?$/i);
  }

  protected getApiUrl(deckId: string) {
    return `https://swuforge.com/api/decks/${encodeURIComponent(deckId)}/json`;
  }
}

class HoloscanDeckBuilder extends DeckBuilder {
  public readonly source = 'holoscan' as const;
  public readonly displayName = 'HoloScan';
  protected readonly hostnames = ['holoscan.net'];

  protected getDeckIdFromUrl(url: URL) {
    return matchPath(url, /^\/decks\/([^/]+)\/?$/i);
  }

  protected getApiUrl(deckId: string) {
    return `https://holoscan.net/api/decks/${encodeURIComponent(deckId)}`;
  }
}

class ProtectThePodDeckBuilder extends DeckBuilder {
  public readonly source = 'protect-the-pod' as const;
  public readonly displayName = 'Protect the Pod';
  protected readonly hostnames = ['protectthepod.com'];

  protected getDeckIdFromUrl(url: URL) {
    return matchPath(url, /^\/pool\/([A-Za-z0-9_-]+)(?:\/|$)/);
  }

  protected getApiUrl(deckId: string) {
    return `https://www.protectthepod.com/api/pools/${encodeURIComponent(deckId)}/deck.json`;
  }
}

class MeleeDeckBuilder extends DeckBuilder {
  public readonly source = 'melee' as const;
  public readonly displayName = 'Melee';
  protected readonly hostnames = ['melee.gg'];

  protected getDeckIdFromUrl(url: URL) {
    return matchPath(url, /^\/Decklist\/View\/([^/]+)\/?$/i);
  }

  protected getApiUrl(deckId: string) {
    return `https://melee.gg/Decklist/View/${encodeURIComponent(deckId)}`;
  }

  public override async fetchDeck(deckId: string): Promise<ExternalDeck> {
    let response: Response;
    try {
      response = await fetch(this.getApiUrl(deckId), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SWUBase deck importer)' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new DeckBuilderError(`Unable to reach ${this.displayName}. Please try again.`, 502);
    }

    if (response.status === 404) {
      throw new DeckBuilderError('Deck not found on Melee. Make sure it is publicly shared.', 404);
    }
    if (!response.ok) {
      throw new DeckBuilderError(`Unable to load the deck from Melee (${response.status}).`, 502);
    }

    let html: string;
    try {
      html = await response.text();
    } catch {
      throw new DeckBuilderError('Unable to read the deck from Melee. Please try again.', 502);
    }

    const { document } = parseHTML(html);
    const text = readMeleeDecklistText(document);
    if (!text.trim()) {
      throw new DeckBuilderError('Melee did not provide a SWU text export for this deck.', 502);
    }

    return {
      metadata: {
        name: document.querySelector('.decklist-title')?.textContent?.trim() ?? '',
        author: '',
      },
      text,
    };
  }
}

const deckBuilders: readonly DeckBuilder[] = [
  new SwudbDeckBuilder(),
  new SwuforgeDeckBuilder(),
  new MeleeDeckBuilder(),
  new HoloscanDeckBuilder(),
  new ProtectThePodDeckBuilder(),
];

export const supportedDeckBuilderSources = deckBuilderSources;

export const getDeckBuilderForLink = (deckLink: string) => {
  const builder = deckBuilders.find(candidate => candidate.matches(deckLink));
  if (!builder) {
    throw new DeckBuilderError(
      'Supported deck links are from SWUDB, SWU Forge, Melee, HoloScan, and Protect the Pod.',
      400,
    );
  }
  return builder;
};

export const getDeckBuilderForSource = (source: string) => {
  const parsedSource = zDeckBuilderSource.safeParse(source);
  const builder = parsedSource.success
    ? deckBuilders.find(candidate => candidate.source === parsedSource.data)
    : undefined;

  if (!builder) {
    throw new DeckBuilderError('The imported deck has an unsupported source.', 502);
  }
  return builder;
};

export const parseImportedDeck = (deck: ExternalDeck, cardList: CardList): ParsedImportedDeck => {
  if ('text' in deck) {
    // Tournament imports use this same converter. No deck ID exists yet for a new import.
    const parsed = parseTextToSwubase(deck.text, cardList, '');
    if (!parsed.leader1 || !parsed.base) {
      throw new DeckBuilderError('Melee did not provide a parseable leader and base.', 502);
    }

    const cards = new Map<string, Omit<DeckCard, 'deckId'>>();
    for (const card of parsed.deckCards) {
      const key = `${card.board}:${card.cardId}`;
      cards.set(key, {
        cardId: card.cardId,
        board: card.board,
        note: '',
        quantity: (cards.get(key)?.quantity ?? 0) + card.quantity,
      });
    }

    return {
      name: getDeckName(deck.metadata.name, deck.metadata.author),
      leaderCardId1: parsed.leader1,
      leaderCardId2: parsed.leader2,
      baseCardId: parsed.base,
      cards: [...cards.values()],
      errors: parsed.errors,
    };
  }

  const cardsBySetAndNumber = buildCardsBySetAndNumber(cardList);
  const errors: string[] = [];
  const resolveCardId = (externalId: string) =>
    cardsBySetAndNumber.get(normalizeExternalCardId(externalId));
  const parseCard = (card: z.infer<typeof zExternalDeckCard> | null | undefined, label: string) => {
    if (!card) {
      errors.push(`Missing ${label}.`);
      return undefined;
    }

    const cardId = resolveCardId(card.id);
    if (!cardId) {
      errors.push(`Unknown ${label}: ${card.id}.`);
    }
    return cardId;
  };

  const leaderCardId1 = parseCard(deck.leader, 'leader');
  const leaderCardId2 = deck.secondleader
    ? parseCard(deck.secondleader, 'second leader')
    : undefined;
  const baseCardId = parseCard(deck.base, 'base');
  const cards = new Map<string, Omit<DeckCard, 'deckId'>>();

  for (const [board, sourceCards] of [
    [1, deck.deck],
    [2, deck.sideboard],
  ] as const) {
    for (const sourceCard of sourceCards) {
      const cardId = resolveCardId(sourceCard.id);
      if (!cardId) {
        errors.push(`Unknown ${board === 1 ? 'main-deck' : 'sideboard'} card: ${sourceCard.id}.`);
        continue;
      }

      const key = `${board}:${cardId}`;
      const existingCard = cards.get(key);
      cards.set(key, {
        cardId,
        board,
        note: '',
        quantity: (existingCard?.quantity ?? 0) + sourceCard.count,
      });
    }
  }

  return {
    name: getDeckName(deck.metadata.name, deck.metadata.author),
    leaderCardId1,
    leaderCardId2,
    baseCardId,
    cards: [...cards.values()],
    errors,
  };
};

const getDeckName = (name: string, author: string) => {
  const normalizedName = name.trim() || 'Imported deck';
  return author.trim()
    ? `${normalizedName} by ${author.trim()}`.slice(0, 255)
    : normalizedName.slice(0, 255);
};

const buildCardsBySetAndNumber = (cardList: CardList) => {
  const cardsBySetAndNumber = new Map<string, string>();

  for (const [cardId, card] of Object.entries(cardList)) {
    if (!card || card.type.includes('Token')) continue;

    for (const variant of Object.values(card.variants ?? {})) {
      if (!variant || variant.cardNo <= 0 || (!card.preview && !variant.baseSet)) continue;
      cardsBySetAndNumber.set(`${variant.set}_${variant.cardNo}`.toUpperCase(), cardId);
    }
  }

  return cardsBySetAndNumber;
};

const normalizeExternalCardId = (cardId: string) => {
  const match = cardId.trim().match(/^([a-z0-9]+)[_-](\d+)$/i);
  return match ? `${match[1]}_${Number(match[2])}`.toUpperCase() : cardId.trim().toUpperCase();
};

const matchPath = (url: URL, expression: RegExp) => url.pathname.match(expression)?.[1];
