import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetConfiscate = {
  cardId: 'confiscate',
  name: 'Confiscate',
  kind: 'event',
  aspects: [],
  traits: ['Law'],
  cost: 1,
  effects: [
    {
      kind: 'defeat-upgrade',
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
