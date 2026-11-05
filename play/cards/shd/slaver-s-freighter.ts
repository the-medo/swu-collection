import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSlaverSFreighter = {
  cardId: 'slaver-s-freighter',
  name: "Slaver's Freighter",
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
            powerAtMost: {
              kind: 'unit-sum',
              filter: {
                controller: 'enemy',
              },
              stat: 'upgrades',
            },
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
