import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const scrambleFighters = {
  cardId: 'scramble-fighters',
  name: 'Scramble Fighters',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Supply'],
  cost: 7,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'tie-fighter',
      count: 8,
      group: 'fighters',
      effects: [
        {
          kind: 'ready-units',
          filter: {
            inGroup: 'fighters',
          },
        },
        {
          kind: 'modify-units',
          filter: {
            inGroup: 'fighters',
          },
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            cannotAttackBases: true,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
