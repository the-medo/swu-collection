import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetRivalSFall = {
  cardId: 'rival-s-fall',
  name: "Rival's Fall",
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 6,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {},
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
