import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEncouragingLeadership = {
  cardId: 'encouraging-leadership',
  name: 'Encouraging Leadership',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 3,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
      },
      operation: {
        kind: 'modify',
        power: 1,
        hp: 1,
        duration: 'phase',
      },
    },
  ],
} as const satisfies EventDefinition;
