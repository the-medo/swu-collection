import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const mazKanataWhereSMyBoyfriend = {
  cardId: 'maz-kanata--where-s-my-boyfriend-',
  name: "Maz Kanata, Where's My Boyfriend?",
  kind: 'unit',
  aspects: ['Command', 'Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'unit',
          trait: 'Underworld',
          max: 1,
          play: {
            discount: 4,
            ready: true,
            after: [
              {
                kind: 'schedule-regroup-operation',
                target: 'played',
                operation: 'bottom',
              },
            ],
          },
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
