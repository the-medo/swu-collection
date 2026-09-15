import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const mouseDroid = {
  cardId: 'mouse-droid',
  name: 'Mouse Droid',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Droid'],
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
            trait: 'Imperial',
          },
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
