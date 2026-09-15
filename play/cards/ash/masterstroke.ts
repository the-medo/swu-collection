import type { EventDefinition } from '../definition.ts';

// ASH 234. Printed text is pinned in meta-movement fixture.
export const masterstroke = {
  cardId: 'masterstroke',
  name: 'Masterstroke',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 2,
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
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: {
            kind: 'unit-count',
            filter: {
              controller: 'enemy',
              sameArenaAs: 'chosen',
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
