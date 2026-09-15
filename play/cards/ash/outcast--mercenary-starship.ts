import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const outcastMercenaryStarship = {
  cardId: 'outcast--mercenary-starship',
  name: 'Outcast, Mercenary Starship',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'enter-power',
      timing: 'friendly-entered',
      effects: [
        {
          kind: 'on-unit',
          target: 'subject',
          operation: {
            kind: 'modify',
            power: 1,
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
