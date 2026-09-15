import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const fnTrooperCorps = {
  cardId: 'fn-trooper-corps',
  name: 'FN Trooper Corps',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['First Order', 'Trooper'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Plot'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
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
    },
  ],
} as const satisfies UnitDefinition;
