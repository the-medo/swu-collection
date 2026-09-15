import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const consortiumStarviper = {
  cardId: 'consortium-starviper',
  name: 'Consortium StarViper',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'initiative',
      },
      abilities: {
        restore: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
