import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const theDaughterEmbodimentOfLight = {
  cardId: 'the-daughter--embodiment-of-light',
  name: 'The Daughter, Embodiment of Light',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Force'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'heal-after-damage',
      timing: 'own-base-damaged',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'heal-own-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
