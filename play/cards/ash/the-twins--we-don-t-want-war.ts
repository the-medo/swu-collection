import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const theTwinsWeDonTWantWar = {
  cardId: 'the-twins--we-don-t-want-war',
  name: "The Twins, We Don't Want War",
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Hutt'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: 'friendly-defeated',
      timing: 'friendly-defeated',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 1,
        },
      ],
      excludeSelf: true,
    },
  ],
} as const satisfies UnitDefinition;
