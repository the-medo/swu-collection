import { z } from 'zod';
import cardListData from '../server/db/json/card-list.json';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../lib/swu-resources/types.ts';

export const cardSearchInput = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .describe('Card name or SWUBASE card ID. All words must match.'),
  limit: z.number().int().min(1).max(25).default(10),
  offset: z.number().int().min(0).max(10_000).default(0),
});

const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const cardList = cardListData as unknown as CardList;
const cards = Object.values(cardList)
  .filter(
    (card): card is CardDataWithVariants<CardListVariants> => card !== undefined && !card.preview,
  )
  .sort((a, b) => a.name.localeCompare(b.name) || a.cardId.localeCompare(b.cardId))
  .map(card => ({ card, searchable: normalize(`${card.name} ${card.cardId}`) }));

export function searchCards(input: z.infer<typeof cardSearchInput>, websiteOrigin: string) {
  const words = normalize(input.query).split(/\s+/).filter(Boolean);
  const matches = cards.filter(({ searchable }) => words.every(word => searchable.includes(word)));
  return {
    catalog: 'official' as const,
    total: matches.length,
    offset: input.offset,
    limit: input.limit,
    cards: matches.slice(input.offset, input.offset + input.limit).map(({ card }) => ({
      cardId: card.cardId,
      name: card.name,
      set: card.set,
      type: card.type,
      aspects: card.aspects,
      cost: card.cost,
      power: card.power,
      hp: card.hp,
      arenas: card.arenas,
      traits: card.traits,
      keywords: card.keywords,
      text: card.text,
      rules: card.rules,
      deployBox: card.deployBox,
      epicAction: card.epicAction,
      url: `${websiteOrigin}/cards/detail/${encodeURIComponent(card.cardId)}`,
    })),
  };
}
