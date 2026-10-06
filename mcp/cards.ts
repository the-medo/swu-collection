import { z } from 'zod';
import cardListData from '../server/db/json/card-list.json';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../lib/swu-resources/types.ts';
import { SwuArena, SwuAspect, SwuSet } from '../types/enums.ts';

const searchText = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .refine(value => /[\p{L}\p{N}]/u.test(value), 'Provide searchable letters or numbers.');
const labels = z.array(z.string().trim().min(1).max(64)).min(1).max(8);
const range = z
  .strictObject({
    min: z.number().int().min(0).max(1000).optional(),
    max: z.number().int().min(0).max(1000).optional(),
  })
  .refine(value => value.min !== undefined || value.max !== undefined, 'Provide min or max.')
  .refine(
    value => value.min === undefined || value.max === undefined || value.min <= value.max,
    'Min must not exceed max.',
  );

export const cardSearchInput = z
  .strictObject({
    query: searchText.optional().describe('Card name or SWUBASE card ID. All words must match.'),
    text: searchText
      .optional()
      .describe('All words must occur in card text, rules, deploy box or epic action.'),
    aspects: z
      .array(z.enum(SwuAspect))
      .min(1)
      .max(6)
      .optional()
      .describe(
        'Green=Command, blue=Vigilance, red=Aggression, yellow=Cunning, white=Heroism, black=Villainy.',
      ),
    aspectMatch: z
      .enum(['any', 'all', 'exact'])
      .default('all')
      .describe(
        'All requires every requested aspect, including repeated aspects; exact excludes additional aspects.',
      ),
    keywords: labels
      .optional()
      .describe('Match any requested printed keyword, case-insensitively.'),
    traits: labels.optional().describe('Match any requested trait, case-insensitively.'),
    cardTypes: labels
      .optional()
      .describe('Match any type: Unit, Event, Upgrade, Leader, Base, or a token type.'),
    arenas: z.array(z.enum(SwuArena)).min(1).max(2).optional(),
    sets: z.array(z.enum(SwuSet)).min(1).max(20).optional(),
    cost: range.optional(),
    power: range.optional(),
    hp: range.optional(),
    sort: z.enum(['name', 'cost']).default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
    limit: z.number().int().min(1).max(25).default(10),
    offset: z.number().int().min(0).max(10_000).default(0),
  })
  .refine(
    input =>
      [
        input.query,
        input.text,
        input.aspects,
        input.keywords,
        input.traits,
        input.cardTypes,
        input.arenas,
        input.sets,
        input.cost,
        input.power,
        input.hp,
      ].some(Boolean),
    'Provide a query or at least one filter.',
  );

export const cardLookupInput = z.strictObject({
  cardIds: z
    .array(z.string().trim().min(1).max(256))
    .min(1)
    .max(25)
    .describe('Exact SWUBASE logical card IDs, not printing/variant IDs. Up to 25.'),
});

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '');
const cardList = cardListData as unknown as CardList;
const cards = Object.values(cardList)
  .filter(
    (card): card is CardDataWithVariants<CardListVariants> => card !== undefined && !card.preview,
  )
  .map(card => ({
    card,
    searchable: normalize(card.name + ' ' + card.cardId),
    text: normalize(
      [card.text, card.rules, card.deployBox, card.epicAction].filter(Boolean).join(' '),
    ),
  }));
const cardsById = new Map(cards.map(({ card }) => [card.cardId, card]));

export function getOfficialCard(cardId: string) {
  return cardsById.get(cardId);
}

export function cardDetails(card: CardDataWithVariants<CardListVariants>, websiteOrigin: string) {
  return {
    cardId: card.cardId,
    name: card.name,
    set: card.set,
    type: card.type,
    rarity: card.rarity,
    aspects: card.aspects,
    cost: card.cost ?? null,
    power: card.power ?? null,
    hp: card.hp ?? null,
    upgradePower: card.upgradePower ?? null,
    upgradeHp: card.upgradeHp ?? null,
    arenas: card.arenas,
    traits: card.traits,
    keywords: card.keywords,
    text: card.text ?? null,
    rules: card.rules ?? null,
    deployBox: card.deployBox ?? null,
    epicAction: card.epicAction ?? null,
    url: websiteOrigin + '/cards/detail/' + encodeURIComponent(card.cardId),
  };
}

const matchesWords = (text: string, query?: string) =>
  !query ||
  normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every(word => text.includes(word));
const matchesAny = (values: readonly string[], requested?: readonly string[]) =>
  !requested ||
  requested.some(value => values.some(existing => normalize(existing) === normalize(value)));
const matchesRange = (value: number | null | undefined, filter?: z.infer<typeof range>) =>
  !filter ||
  (value != null &&
    (filter.min === undefined || value >= filter.min) &&
    (filter.max === undefined || value <= filter.max));

function matchesAspects(
  card: CardDataWithVariants<CardListVariants>,
  input: z.infer<typeof cardSearchInput>,
) {
  if (!input.aspects) return true;
  if (input.aspectMatch === 'any')
    return input.aspects.some(aspect => card.aspects.includes(aspect));
  const remaining = [...card.aspects];
  for (const aspect of input.aspects) {
    const index = remaining.indexOf(aspect);
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return input.aspectMatch !== 'exact' || remaining.length === 0;
}

export function searchCards(input: z.infer<typeof cardSearchInput>, websiteOrigin: string) {
  const matches = cards
    .filter(
      ({ card, searchable, text }) =>
        matchesWords(searchable, input.query) &&
        matchesWords(text, input.text) &&
        matchesAspects(card, input) &&
        matchesAny(card.keywords, input.keywords) &&
        matchesAny(card.traits, input.traits) &&
        matchesAny([card.type], input.cardTypes) &&
        matchesAny(card.arenas, input.arenas) &&
        matchesAny([card.set], input.sets) &&
        matchesRange(card.cost, input.cost) &&
        matchesRange(card.power, input.power) &&
        matchesRange(card.hp, input.hp),
    )
    .sort(({ card: a }, { card: b }) => {
      const direction = input.order === 'desc' ? -1 : 1;
      if (input.sort === 'cost' && a.cost !== b.cost) {
        if (a.cost == null) return 1;
        if (b.cost == null) return -1;
        return (a.cost - b.cost) * direction;
      }
      return (a.name.localeCompare(b.name) || a.cardId.localeCompare(b.cardId)) * direction;
    });
  return {
    catalog: 'official' as const,
    total: matches.length,
    offset: input.offset,
    limit: input.limit,
    cards: matches
      .slice(input.offset, input.offset + input.limit)
      .map(({ card }) => cardDetails(card, websiteOrigin)),
  };
}

export function getCards(input: z.infer<typeof cardLookupInput>, websiteOrigin: string) {
  const ids = [...new Set(input.cardIds)];
  return {
    catalog: 'official' as const,
    cards: ids.flatMap(id => {
      const card = getOfficialCard(id);
      return card ? [cardDetails(card, websiteOrigin)] : [];
    }),
    missingCardIds: ids.filter(id => !getOfficialCard(id)),
  };
}
