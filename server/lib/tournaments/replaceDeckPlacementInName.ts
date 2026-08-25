const deckPlacementPrefix = /^#\d+/;

/** Replaces the leading `#<placement>` portion of an imported tournament deck name. */
export function replaceDeckPlacementInName(name: string, placement: number): string {
  return name.replace(deckPlacementPrefix, `#${placement}`);
}
