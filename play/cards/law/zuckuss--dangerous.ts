import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const zuckussDangerous = {
  cardId: 'zuckuss--dangerous',
  name: 'Zuckuss, Dangerous',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'bounty-hunter-damage',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Bounty Hunter',
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'damage-unit',
              amount: 'source-power',
              arena: 'ground',
              optional: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
