import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetFellTheDragon = {
  cardId: 'fell-the-dragon',
  name: 'Fell the Dragon',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        nonLeader: true,
        powerAtLeast: 5,
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
