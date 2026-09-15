import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const theGalleonMaraudingPirateShip = {
  cardId: 'the-galleon--marauding-pirate-ship',
  name: 'The Galleon, Marauding Pirate Ship',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'disclose-spies',
      timing: 'played',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression', 'Aggression', 'Villainy'],
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
