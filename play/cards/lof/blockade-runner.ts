import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const blockadeRunner = {
  cardId: 'blockade-runner',
  name: 'Blockade Runner',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'space',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'combat-experience',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            sameAs: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
