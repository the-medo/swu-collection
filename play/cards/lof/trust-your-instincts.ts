import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const trustYourInstincts = {
  cardId: 'trust-your-instincts',
  name: 'Trust Your Instincts',
  kind: 'event',
  aspects: ['Cunning'],
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
          forAttack: {},
          filter: {
            controller: 'friendly',
            exhausted: false,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 2,
              combatFirst: {
                kind: 'always',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
