import type { LeaderDefinition } from '../definition.ts';

// Official face text is pinned in leader-repeated-abilities.json.
export const enfysNestUntilWeCanGoNoHigher = {
  cardId: 'enfys-nest--until-we-can-go-no-higher',
  name: 'Enfys Nest, Until We Can Go No Higher',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'repeat-attack',
          timing: 'attack-ability-used',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'resources',
                  amount: 2,
                },
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'repeat-attack-ability',
                  index: 'used-attack',
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'repeat-attack',
          timing: 'attack-ability-used',
          optional: true,
          limit: 'once-per-round',
          effects: [
            {
              kind: 'repeat-attack-ability',
              index: 'used-attack',
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
