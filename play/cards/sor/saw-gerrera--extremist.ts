import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSawGerreraExtremist = {
  cardId: 'saw-gerrera--extremist',
  name: 'Saw Gerrera, Extremist',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Rebel'],
  cost: 4,
  unique: true,
  power: 5,
  hp: 4,
  arena: 'ground',
  enemyEventPlayDamage: 2,
} as const satisfies UnitDefinition;
