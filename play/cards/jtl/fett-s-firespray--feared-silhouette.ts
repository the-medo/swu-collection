import type { UnitDefinition } from '../definition.ts';

// JTL 240. Printed text is pinned in meta-force-indirect fixture.
export const fettSFiresprayFearedSilhouette = {
  cardId: 'fett-s-firespray--feared-silhouette',
  name: "Fett's Firespray, Feared Silhouette",
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'controls-name',
            name: 'Boba Fett',
          },
          effects: [
            {
              kind: 'indirect-damage',
              amount: 2,
              recipient: 'chosen',
            },
          ],
          otherwise: [
            {
              kind: 'indirect-damage',
              amount: 1,
              recipient: 'chosen',
            },
          ],
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
            kind: 'controls-name',
            name: 'Boba Fett',
          },
          effects: [
            {
              kind: 'indirect-damage',
              amount: 2,
              recipient: 'chosen',
            },
          ],
          otherwise: [
            {
              kind: 'indirect-damage',
              amount: 1,
              recipient: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
