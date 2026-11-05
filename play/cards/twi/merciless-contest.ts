import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMercilessContest = {
  cardId: 'merciless-contest',
  name: 'Merciless Contest',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      optional: false,
      bind: 'friendly',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
          },
          optional: false,
          bind: 'enemy',
          effects: [
            {
              kind: 'defeat-bound',
              targets: ['friendly', 'enemy'],
            },
          ],
          chooser: 'enemy',
          allowMissing: true,
        },
      ],
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;
