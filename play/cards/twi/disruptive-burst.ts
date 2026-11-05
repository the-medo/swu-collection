import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDisruptiveBurst = {
  cardId: 'disruptive-burst',
  name: 'Disruptive Burst',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'enemy',
      },
      operation: {
        kind: 'modify',
        power: -1,
        hp: -1,
        duration: 'phase',
      },
    },
  ],
} as const satisfies EventDefinition;
