import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const r5D4BuiltForAdventure = {
  cardId: 'r5-d4--built-for-adventure',
  name: 'R5-D4, Built for Adventure',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Droid'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'strip-defender',
      timing: 'attack',
      effects: [
        {
          kind: 'select-upgrades',
          min: 'all',
          max: 'all',
          filter: {
            attachedTo: 'defender',
          },
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
