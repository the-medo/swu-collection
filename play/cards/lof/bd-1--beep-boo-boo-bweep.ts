import type { UnitDefinition } from '../definition.ts';

// LOF 191. Printed text and rulings are pinned in meta-disclose fixture.
export const bd1BeepBooBooBweep = {
  cardId: 'bd-1--beep-boo-boo-bweep',
  name: 'BD-1, Beep Boo Boo Bweep',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Droid'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  unique: true,
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 1,
                hp: 0,
                duration: 'source-in-play',
                abilities: {
                  keywords: ['Saboteur'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
