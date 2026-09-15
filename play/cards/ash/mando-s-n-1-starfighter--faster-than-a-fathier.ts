import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const mandoSN1StarfighterFasterThanAFathier = {
  cardId: 'mando-s-n-1-starfighter--faster-than-a-fathier',
  name: "Mando's N-1 Starfighter, Faster than a Fathier",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Mandalorian', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  unique: true,
  keywords: ['Support'],
  triggers: [
    {
      id: 'exhaust-leader',
      timing: 'attack',
      effects: [
        {
          kind: 'exhaust-leader',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
