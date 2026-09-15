import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const homesteadMilitia = {
  cardId: 'homestead-militia',
  name: 'Homestead Militia',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'numeric-at-least',
        value: { kind: 'zone-size', zone: 'resources', player: 'self' },
        amount: 6,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
