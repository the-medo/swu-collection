import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const kyloRenIKnowYourStory = {
  cardId: 'kylo-ren--i-know-your-story',
  name: 'Kylo Ren, I Know Your Story',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'First Order'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'upgrade-force-draw',
      timing: 'upgrade-played-on-self',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
