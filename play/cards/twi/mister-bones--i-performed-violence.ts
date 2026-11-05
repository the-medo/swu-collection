import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMisterBonesIPerformedViolence = {
  cardId: 'mister-bones--i-performed-violence',
  name: 'Mister Bones, I Performed Violence',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Fringe', 'Droid'],
  cost: 1,
  unique: true,
  power: 3,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'numeric-equal',
            left: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'self',
            },
            right: 0,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                arena: 'ground',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
                  amount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
