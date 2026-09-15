import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const targetTheMainGenerator = {
  cardId: 'target-the-main-generator',
  name: 'Target the Main Generator',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-target',
      bases: 'any',
      bind: 'base',
      optional: false,
      effects: [
        {
          kind: 'damage-target',
          target: 'base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
