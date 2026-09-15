import type { UnitDefinition } from '../definition.ts';

export const academyGraduate = {
  cardId: 'academy-graduate',
  name: 'Academy Graduate',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Pilot'],
  cost: 2,
  power: 1,
  hp: 2,
  arena: 'ground',
  keywords: ['Sentinel'],
  piloting: [{ id: 'piloting', cost: 2, aspects: ['Vigilance'] }],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: { power: 1, hp: 2 },
    grants: { keywords: ['Sentinel'] },
  },
} as const satisfies UnitDefinition;
