/** Melee embeds its SWU text export in the deck page for both import flows. */
export const readMeleeDecklistText = (document: Document): string =>
  document.querySelector('pre#decklist-swu-text')?.textContent ?? '';
