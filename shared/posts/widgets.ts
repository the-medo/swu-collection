import { z } from 'zod';

// Card/variant IDs index catalog dictionaries. Inherited property names are not references.
const inheritedKeys = new Set(Object.getOwnPropertyNames(Object.prototype));
const catalogKey = z
  .string()
  .max(255)
  .refine(value => !inheritedKeys.has(value), 'Invalid card reference.');
const cardId = catalogKey.refine(value => value.length > 0, 'Choose a card.');
export const cardReferenceSchema = z.object({
  cardId,
  variantId: catalogKey,
  name: z.string().max(255),
});
export type CardReference = z.infer<typeof cardReferenceSchema>;

export const cardSizeSchema = z.enum(['small', 'medium', 'large']).default('medium');
export type CardSize = z.infer<typeof cardSizeSchema>;
export const deckReferenceSchema = z.object({ deckId: z.uuid() });
export type DeckReference = z.infer<typeof deckReferenceSchema>;
export const mentionSchema = z.object({
  id: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
});
export type UserMention = z.infer<typeof mentionSchema>;
export const metaSettingsSchema = z.object({
  leaderSearch: z.string().max(100).optional(),
  metaPart: z.enum(['all', 'top8', 'day2', 'top64', 'champions']).default('all'),
  metaInfo: z
    .enum([
      'leaders',
      'leadersAndBase',
      'bases',
      'aspects',
      'aspectsBase',
      'aspectsDetailed',
      'sets',
    ])
    .default('leaders'),
});
export const widgetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('meta-analysis'),
    scope: z.enum(['tournament', 'group']),
    id: z.uuid(),
    settings: metaSettingsSchema,
  }),
  z.object({
    kind: z.literal('matchup'),
    title: z.string().max(120).default('Matchup plan'),
    subtitle: z.string().max(240).default(''),
    leftLeader: cardId,
    leftBase: cardId.optional(),
    rightLeader: cardId,
    rightBase: cardId.optional(),
    text: z.string().min(1).max(5000),
  }),
  z.object({
    kind: z.literal('card-group'),
    cards: z.array(cardReferenceSchema).min(1).max(30),
    size: cardSizeSchema,
    text: z.string().max(5000),
  }),
  z.object({
    kind: z.literal('callout'),
    tone: z.enum(['tip', 'warning', 'key-play']),
    title: z.string().min(1).max(120),
    text: z.string().min(1).max(5000),
  }),
]);
export type Widget = z.infer<typeof widgetSchema>;
export const insertionSchema = z.union([
  z.object({ kind: z.literal('card-image'), card: cardReferenceSchema, size: cardSizeSchema }),
  z.object({ kind: z.literal('card-link'), card: cardReferenceSchema }),
  z.object({ kind: z.literal('decklist'), deck: deckReferenceSchema }),
  z.object({ kind: z.literal('mention'), user: mentionSchema }),
  widgetSchema,
]);
export type Insertion = z.infer<typeof insertionSchema>;
export const isInlineInsertion = (value: Insertion) =>
  value.kind === 'card-link' || value.kind === 'mention';

export const profileHref = (id: string) => `/users/${encodeURIComponent(id)}`;
export function insertionLabel(value: Insertion) {
  if (value.kind === 'card-image' || value.kind === 'card-link') return value.card.name;
  if (value.kind === 'decklist') return `SWUBASE deck: ${deckHref(value.deck.deckId)}`;
  if (value.kind === 'mention') return `@${value.user.displayName}`;
  if (value.kind === 'callout') return `${value.title}: ${value.text}`;
  if (value.kind === 'meta-analysis') return `Meta analysis: ${value.scope} ${value.id}`;
  if (value.kind === 'card-group')
    return [value.cards.map(card => card.name).join(', '), value.text].filter(Boolean).join('\n');
  return [value.title, value.subtitle, `${value.leftLeader} vs ${value.rightLeader}`, value.text]
    .filter(Boolean)
    .join('\n');
}
export function insertionHref(value: Insertion) {
  if (value.kind === 'card-image' || value.kind === 'card-link') return cardHref(value.card.cardId);
  if (value.kind === 'decklist') return deckHref(value.deck.deckId);
  if (value.kind === 'mention') return profileHref(value.user.id);
  if (value.kind === 'meta-analysis')
    return value.scope === 'tournament'
      ? `/tournaments/${value.id}/meta`
      : `/meta?maTournamentGroupId=${value.id}`;
  return undefined;
}

export const cardHref = (id: string) => `/cards/detail/${encodeURIComponent(id)}`;
export const deckHref = (id: string) => `/decks/${encodeURIComponent(id)}`;
