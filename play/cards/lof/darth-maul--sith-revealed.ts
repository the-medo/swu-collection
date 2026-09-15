import type { LeaderDefinition } from '../definition.ts';

// LOF 009. Printed text is pinned in meta-force-indirect fixture.
export const darthMaulSithRevealed = {
  cardId: 'darth-maul--sith-revealed',
  name: 'Darth Maul, Sith Revealed',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Sith'],
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'damage-two-units',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'force',
            },
          ],
          limit: null,
          effects: [{ kind: 'damage-units', amount: 1, filter: {}, max: 2, mandatory: true }],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'on-attack',
          timing: 'attack',
          effects: [{ kind: 'damage-units', amount: 1, filter: {}, max: 2, mandatory: true }],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
