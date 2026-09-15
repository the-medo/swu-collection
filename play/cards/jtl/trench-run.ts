import type { EventDefinition } from '../definition.ts';
export const trenchRun = {
  cardId: 'trench-run',
  name: 'Trench Run',
  kind: 'event',
  cost: 1,
  aspects: ['Aggression', 'Heroism'],
  traits: ['Gambit'],
  effects: [
    {
      kind: 'attack-with-unit',
      filter: { trait: 'Fighter' },
      powerBonus: 4,
      grantSourceTriggers: true,
    },
  ],
  attackGrants: [
    {
      id: 'trench-run-risk',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'defender',
          count: 2,
          bind: 'first-discard',
          group: 'discarded',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'damage',
                amount: { kind: 'cost-difference', group: 'discarded' },
                unpreventable: true,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
