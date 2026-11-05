import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBobaFettDisintegrator = {
  cardId: 'boba-fett--disintegrator',
  name: 'Boba Fett, Disintegrator',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'defender',
            filter: {
              exhausted: true,
              enteredThisRound: false,
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'damage',
                amount: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
