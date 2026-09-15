import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const jediVector = {
  cardId: 'jedi-vector',
  name: 'Jedi Vector',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Jedi', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Jedi',
          otherThan: 'source',
        },
        amount: 1,
      },
      power: 1,
    },
    {
      condition: {
        kind: 'cards-in-play-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Lightsaber',
          roles: ['upgrade'],
        },
        amount: 1,
      },
      power: 1,
    },
  ],
} as const satisfies UnitDefinition;
