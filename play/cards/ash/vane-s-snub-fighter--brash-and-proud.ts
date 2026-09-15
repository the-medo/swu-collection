import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const vaneSSnubFighterBrashAndProud = {
  cardId: 'vane-s-snub-fighter--brash-and-proud',
  name: "Vane's Snub Fighter, Brash and Proud",
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'combat-advantage',
      timing: 'friendly-attack-ended',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'advantage',
            count: 1,
          },
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'combat-base-damage',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
