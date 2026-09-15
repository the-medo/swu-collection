import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const nebulonCFrigate = {
  cardId: 'nebulon-c-frigate',
  name: 'Nebulon-C Frigate',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['New Republic', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-target',
          units: {},
          bases: 'any',
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
