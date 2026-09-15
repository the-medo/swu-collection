import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const sullustanSpacer = {
  cardId: 'sullustan-spacer',
  name: 'Sullustan Spacer',
  kind: 'unit',
  aspects: [],
  traits: ['Fringe', 'Pilot'],
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: [],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 1,
    },
  },
} as const satisfies UnitDefinition;
