import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const premorPersonnelCarrier = {
  cardId: 'premor-personnel-carrier',
  name: 'PreMor Personnel Carrier',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Vehicle', 'Transport'],
  cost: 8,
  power: 6,
  hp: 6,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: {
              kind: 'unit-count',
              filter: {
                controller: 'friendly',
                arena: 'ground',
              },
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
