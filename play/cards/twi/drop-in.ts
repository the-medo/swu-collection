import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDropIn = {
  cardId: 'drop-in',
  name: 'Drop In',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Supply'],
  cost: 4,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'clone-trooper',
      count: 2,
    },
  ],
} as const satisfies EventDefinition;
