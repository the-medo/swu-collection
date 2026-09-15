import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const tuskenTracker = {
  cardId: 'tusken-tracker',
  name: 'Tusken Tracker',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: [],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  raid: 2,
  triggers: [
    {
      id: 'expose',
      timing: 'played',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'enemy',
          },
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            lostKeywords: ['Hidden'],
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
