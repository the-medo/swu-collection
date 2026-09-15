import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const overchargedTransport = {
  cardId: 'overcharged-transport',
  name: 'Overcharged Transport',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Vehicle', 'Transport'],
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'space',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'defeat-upgrade',
              attachedTo: 'chosen',
              optional: true,
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'space',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'defeat-upgrade',
              attachedTo: 'chosen',
              optional: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
