import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const kazudaXionoIMNotASpy = {
  cardId: 'kazuda-xiono--i-m-not-a-spy',
  name: "Kazuda Xiono, I'm Not A Spy",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'ground',
  raid: 2,
  constant: [
    {
      condition: {
        kind: 'fewer-resources-than-opponent',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
