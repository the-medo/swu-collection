import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const admiralOzzelAsClumsyAsHeIsStupid = {
  cardId: 'admiral-ozzel--as-clumsy-as-he-is-stupid',
  name: 'Admiral Ozzel, As Clumsy as He Is Stupid',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'discarded',
          group: 'discarded-cards',
          effects: [
            {
              kind: 'move-cards',
              group: 'discarded-cards',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
