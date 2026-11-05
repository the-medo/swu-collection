import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEvacuate = {
  cardId: 'evacuate',
  name: 'Evacuate',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 6,
  effects: [
    {
      kind: 'each-unit',
      filter: {
        nonLeader: true,
      },
      bind: 'recipient',
      effects: [
        {
          kind: 'on-unit',
          target: 'recipient',
          operation: {
            kind: 'return-to-hand',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
