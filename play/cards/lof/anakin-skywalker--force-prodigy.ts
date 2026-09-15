import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const anakinSkywalkerForceProdigy = {
  cardId: 'anakin-skywalker--force-prodigy',
  name: 'Anakin Skywalker, Force Prodigy',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Fringe'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  keywords: ['Hidden', 'Shielded'],
} as const satisfies UnitDefinition;
