import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const unleashRage = {
  cardId: 'unleash-rage',
  name: 'Unleash Rage',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'pay',
      costs: [
        {
          kind: 'force',
        },
      ],
      optional: false,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 3,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
