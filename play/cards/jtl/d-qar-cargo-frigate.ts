import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const dQarCargoFrigate = {
  cardId: 'd-qar-cargo-frigate',
  name: "D'Qar Cargo Frigate",
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 6,
  hp: 7,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'difference',
        left: 0,
        right: {
          kind: 'unit-sum',
          filter: {
            sameAs: 'source',
          },
          stat: 'damage',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
