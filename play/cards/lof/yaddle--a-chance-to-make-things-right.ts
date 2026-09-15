import type { UnitDefinition } from '../definition.ts';

// LOF . Printed text is pinned in the meta effects fixture.
export const yaddleAChanceToMakeThingsRight = {
  cardId: 'yaddle--a-chance-to-make-things-right',
  name: 'Yaddle, A Chance To Make Things Right',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            trait: 'Jedi',
            otherThan: 'source',
          },
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
                  restore: 1,
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
