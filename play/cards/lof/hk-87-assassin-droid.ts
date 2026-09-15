import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const hk87AssassinDroid = {
  cardId: 'hk-87-assassin-droid',
  name: 'HK-87 Assassin Droid',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Droid'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'damage-on-defeat',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: {
            arena: 'ground',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
