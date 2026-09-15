import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const darthVaderTwilightOfTheApprentice = {
  cardId: 'darth-vader--twilight-of-the-apprentice',
  name: 'Darth Vader, Twilight of the Apprentice',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'shield-both',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
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
      id: 'defeat-shielded',
      timing: 'attack',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            controller: 'enemy',
            withUpgrade: 'shield',
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
