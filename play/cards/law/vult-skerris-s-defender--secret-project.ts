import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const vultSkerrisSDefenderSecretProject = {
  cardId: 'vult-skerris-s-defender--secret-project',
  name: "Vult Skerris's Defender, Secret Project",
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'discard-shield',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'phase-event',
            event: 'own-card-discarded',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'damage-exhaust',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'space',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
