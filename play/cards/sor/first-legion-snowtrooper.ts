import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFirstLegionSnowtrooper = {
  cardId: 'first-legion-snowtrooper',
  name: 'First Legion Snowtrooper',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'attacking-damaged-unit',
      },
      power: 2,
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
} as const satisfies UnitDefinition;
