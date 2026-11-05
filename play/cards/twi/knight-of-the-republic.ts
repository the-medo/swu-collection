import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKnightOfTheRepublic = {
  cardId: 'knight-of-the-republic',
  name: 'Knight of the Republic',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 6,
  power: 4,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
