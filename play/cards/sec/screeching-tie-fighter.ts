import type { UnitDefinition } from '../definition.ts';

// SEC 185. Printed text and rulings are pinned in meta-disclose fixture.
export const screechingTieFighter = {
  cardId: 'screeching-tie-fighter',
  name: 'Screeching TIE Fighter',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                loseKeywords: true,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
