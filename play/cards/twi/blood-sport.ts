import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetBloodSport = {
  cardId: 'blood-sport',
  name: 'Blood Sport',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Fringe'],
  cost: 3,
  effects: [
    {
      kind: 'damage-units',
      amount: 2,
      filter: {
        arena: 'ground',
      },
    },
  ],
} as const satisfies EventDefinition;
