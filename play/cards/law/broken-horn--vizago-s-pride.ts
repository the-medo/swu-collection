import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const brokenHornVizagoSPride = {
  cardId: 'broken-horn--vizago-s-pride',
  name: "Broken Horn, Vizago's Pride",
  kind: 'unit',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'more-cards-than-opponent',
            player: 'enemy',
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'fewer-resources-than-opponent',
          },
          effects: [
            {
              kind: 'resource-top',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
