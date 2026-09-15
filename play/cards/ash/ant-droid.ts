import type { UnitDefinition } from '../definition.ts';

// ASH . V8 rules; printed text pinned in meta combat fixture.
export const antDroid = {
  cardId: 'ant-droid',
  name: 'Ant Droid',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Droid'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
