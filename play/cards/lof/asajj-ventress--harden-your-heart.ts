import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const asajjVentressHardenYourHeart = {
  cardId: 'asajj-ventress--harden-your-heart',
  name: 'Asajj Ventress, Harden Your Heart',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Night', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'strengthen-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Force',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'strengthen-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Force',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
