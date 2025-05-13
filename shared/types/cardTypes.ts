const cardTypes = [
  'Leader',
  'Base',
  'Unit',
  'UnitGround',
  'UnitSpace',
  'Event',
  'Upgrade',
  'Unknown',
] as const;

export type CardType = (typeof cardTypes)[number];

export const cardTypeLabels: Record<CardType, string> = {
  Leader: 'Leader',
  Base: 'Base',
  Unit: 'Unit',
  UnitGround: 'Unit - Ground',
  UnitSpace: 'Unit - Space',
  Event: 'Event',
  Upgrade: 'Upgrade',
  Unknown: 'Unknown',
};

export const cardTypeSortValues: Record<CardType, number> = {
  Leader: 0,
  Base: 10,
  Unit: 19,
  UnitGround: 20,
  UnitSpace: 30,
  Event: 40,
  Upgrade: 50,
  Unknown: 60,
};
