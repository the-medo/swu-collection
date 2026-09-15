import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const heroicArc170 = {
  cardId: 'heroic-arc-170',
  name: 'Heroic ARC-170',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
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
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          damaged: true,
        },
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
