import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const assassinProbe = {
  cardId: 'assassin-probe',
  name: 'Assassin Probe',
  kind: 'unit',
  aspects: [],
  traits: ['Separatist', 'Droid'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {
            controller: 'enemy',
            arena: 'ground',
            exhausted: true,
          },
          mandatory: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
