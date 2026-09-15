import type { UnitDefinition } from '../definition.ts';

// JTL 133. Printed text is pinned in meta-force-indirect fixture.
export const allegiantGeneralPrydeRuthlessAndLoyal = {
  cardId: 'allegiant-general-pryde--ruthless-and-loyal',
  name: 'Allegiant General Pryde, Ruthless and Loyal',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Official'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'on-indirect-unit-damaged',
      timing: 'indirect-unit-damaged',
      effects: [
        {
          kind: 'defeat-upgrade',
          optional: true,
          attachedTo: 'subject',
          nonUnique: true,
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'indirect-damage',
              amount: 2,
              recipient: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
