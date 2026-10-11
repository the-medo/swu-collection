import type { CardList, CardVariant } from '../../lib/swu-resources/types.ts';
import type { ArtistIdentity } from '../../types/Artist.ts';

// Preserve punctuation and accents: similarly named artists must remain distinct.
export const getArtistKey = (name: string) =>
  name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

export const hasArtistCredit = (name: string) => {
  const key = getArtistKey(name);
  return key !== '' && key !== 'unknown';
};

export const isArtistShowcaseVariant = (variant: CardVariant) =>
  !/foil|hyperspace|serialized/i.test(variant.variantName);

export function getArtistPrintings(
  cards: CardList,
  artistKey: string,
  options: { includeDuplicates?: boolean; creditKeys?: readonly string[] } = {},
) {
  const key = getArtistKey(artistKey);
  if (!hasArtistCredit(key)) return [];
  const keys = new Set([key, ...(options.creditKeys ?? []).map(getArtistKey)]);

  return Object.values(cards)
    .flatMap(card =>
      card
        ? Object.values(card.variants).flatMap(variant =>
            variant &&
            keys.has(getArtistKey(variant.artist)) &&
            (options.includeDuplicates || isArtistShowcaseVariant(variant))
              ? [{ card, variant }]
              : [],
          )
        : [],
    )
    .sort(
      (a, b) =>
        a.card.name.localeCompare(b.card.name) ||
        a.variant.set.localeCompare(b.variant.set) ||
        a.variant.cardNo - b.variant.cardNo ||
        a.variant.variantId.localeCompare(b.variant.variantId),
    );
}

export type ArtistPrinting = ReturnType<typeof getArtistPrintings>[number];

export function getFeaturedArtistPrintings(printings: ArtistPrinting[], limit = 3) {
  const seen = new Set<string>();
  return [...printings]
    .sort(
      (a, b) =>
        Number(/showcase|prestige/i.test(b.variant.variantName)) -
        Number(/showcase|prestige/i.test(a.variant.variantName)),
    )
    .filter(({ card }) => {
      if (seen.has(card.cardId)) return false;
      seen.add(card.cardId);
      return true;
    })
    .slice(0, limit);
}

export function getArtistDirectory(
  cards: CardList,
  identities: readonly ArtistIdentity[] = [],
  options: { featuredFilter?: (printing: ArtistPrinting) => boolean } = {},
) {
  const byCredit = new Map(
    identities.flatMap(identity => identity.creditKeys.map(key => [key, identity] as const)),
  );
  const groups = new Map<
    string,
    ArtistIdentity & { credits: Set<string>; printings: ArtistPrinting[] }
  >();
  for (const card of Object.values(cards)) {
    if (!card) continue;
    for (const variant of Object.values(card.variants)) {
      if (!variant || !hasArtistCredit(variant.artist) || !isArtistShowcaseVariant(variant))
        continue;
      const key = getArtistKey(variant.artist);
      const identity = byCredit.get(key) ?? { key, name: variant.artist.trim(), creditKeys: [key] };
      const entry = groups.get(identity.key) ?? {
        ...identity,
        credits: new Set<string>(),
        printings: [],
      };
      entry.credits.add(variant.artist.trim());
      entry.printings.push({ card, variant });
      groups.set(identity.key, entry);
    }
  }
  return [...groups.values()]
    .map(({ credits, printings, ...identity }) => ({
      ...identity,
      credits: [...credits].sort(),
      cardCount: new Set(printings.map(({ card }) => card.cardId)).size,
      printingCount: printings.length,
      featured: getFeaturedArtistPrintings(
        options.featuredFilter ? printings.filter(options.featuredFilter) : printings,
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

export function getCatalogArtists(cards: CardList) {
  const artists = new Map<
    string,
    { key: string; name: string; cardIds: Set<string>; printingCount: number }
  >();
  for (const card of Object.values(cards)) {
    if (!card) continue;
    for (const variant of Object.values(card.variants)) {
      if (!variant || !hasArtistCredit(variant.artist)) continue;
      const key = getArtistKey(variant.artist);
      const entry = artists.get(key) ?? {
        key,
        name: variant.artist.trim(),
        cardIds: new Set<string>(),
        printingCount: 0,
      };
      if (isArtistShowcaseVariant(variant)) {
        entry.cardIds.add(card.cardId);
        entry.printingCount++;
      }
      artists.set(key, entry);
    }
  }
  return [...artists.values()]
    .map(({ cardIds, ...artist }) => ({ ...artist, cardCount: cardIds.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isArtistLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
