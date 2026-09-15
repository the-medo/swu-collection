import titles from './catalog-names.json';
// This official title snapshot is pinned with the executable, independently of
// implemented behavior. Naming a card never grants permission to play it.
export const cardTitles: Readonly<Record<string, string>> = Object.freeze(titles);
export function cardTitle(cardId: string): string | undefined {
  return Object.hasOwn(cardTitles, cardId) ? cardTitles[cardId] : undefined;
}
export const officialTitles: ReadonlySet<string> = new Set(Object.values(cardTitles));
