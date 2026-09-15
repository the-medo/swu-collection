import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-allocations.json.
export const firstBattleMemorial = {
  cardId: 'first-battle-memorial',
  name: 'First Battle Memorial',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 27,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'distribute',
          benefit: 'experience',
          amount: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              leader: true,
            },
          },
          exact: true,
          filter: {},
          bind: 'given',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
