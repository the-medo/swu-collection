import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const tandemAssault = {
  cardId: 'tandem-assault',
  name: 'Tandem Assault',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      forAttack: {},
      filter: {
        controller: 'friendly',
        arena: 'space',
        exhausted: false,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          after: [
            {
              kind: 'attack-with-unit',
              filter: {
                arena: 'ground',
              },
              powerBonus: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
