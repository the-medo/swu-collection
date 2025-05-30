export enum CardCondition {
  MT = 'MT',
  NM = 'NM',
  EX = 'EX',
  GD = 'GD',
  LP = 'LP',
  PL = 'PL',
  PO = 'PO',
}

export enum CardLanguage {
  EN = 'EN',
  DE = 'DE',
  ES = 'ES',
  FR = 'FR',
  IT = 'IT',
}

export enum SwuSet {
  SOR = 'sor',
  TWI = 'twi',
  SHD = 'shd',
  JTL = 'jtl',
}

export enum SwuAspect {
  COMMAND = 'Command',
  AGGRESSION = 'Aggression',
  CUNNING = 'Cunning',
  VIGILANCE = 'Vigilance',
  HEROISM = 'Heroism',
  VILLAINY = 'Villainy',
}

export enum SwuRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  LEGENDARY = 'Legendary',
  SPECIAL = 'Special',
}

export enum SwuArena {
  GROUND = 'Ground',
  SPACE = 'Space',
}

export enum CollectionType {
  COLLECTION = 1,
  WANTLIST = 2,
  OTHER = 3,
}

export enum DeckLayout {
  TEXT = 'text',
  TEXT_CONDENSED = 'text-condensed',
  VISUAL_GRID = 'visual-grid',
  VISUAL_GRID_OVERLAP = 'visual-grid-overlap',
  VISUAL_STACKS = 'visual-stacks',
  VISUAL_STACKS_SPLIT = 'visual-stacks-split',
}

export enum DeckGroupBy {
  CARD_TYPE = 'card-type',
  COST = 'cost',
  ASPECT = 'aspect',
  TRAIT = 'trait',
  KEYWORDS = 'keywords',
}
