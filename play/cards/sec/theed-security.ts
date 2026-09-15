import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const theedSecurity = {
  cardId: 'theed-security',
  name: 'Theed Security',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Naboo', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'cards-in-play-at-least',
        filter: {
          controller: 'enemy',
          roles: ['upgrade'],
        },
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
