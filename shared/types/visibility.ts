export enum Visibility {
  Public = 'public',
  Private = 'private',
  Unlisted = 'unlisted',
}

// Map visibility string -> deck.public integer (0=private, 1=public, 2=unlisted)
export const visibilityToPublicMap: Record<Visibility, number> = {
  [Visibility.Private]: 0,
  [Visibility.Public]: 1,
  [Visibility.Unlisted]: 2,
};

export const publicToVisibilityMap: Record<number, Visibility> = {
  0: Visibility.Private,
  1: Visibility.Public,
  2: Visibility.Unlisted,
};
