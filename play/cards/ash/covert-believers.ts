import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const covertBelievers = {
  cardId: 'covert-believers',
  name: 'Covert Believers',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'mandalorian',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
