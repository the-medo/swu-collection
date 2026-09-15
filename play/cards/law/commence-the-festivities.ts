import type { EventDefinition } from '../definition.ts';

// LAW 202. Printed text is pinned in meta-movement fixture.
export const commenceTheFestivities = {
  cardId: 'commence-the-festivities',
  name: 'Commence the Festivities',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      forAttack: {},
      bind: 'chosen',
      filter: {
        controller: 'friendly',
        exhausted: false,
      },
      optional: false,
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'fewer-resources-than-opponent',
          },
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 2,
              abilities: {
                keywords: ['Saboteur'],
              },
            },
          ],
          otherwise: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 0,
              abilities: {
                keywords: ['Saboteur'],
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
