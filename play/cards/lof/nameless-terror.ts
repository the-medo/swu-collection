import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const namelessTerror = {
  cardId: 'nameless-terror',
  name: 'Nameless Terror',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Creature'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'exhaust-force',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Force',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'sever-force',
      timing: 'attack',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'enemy',
          },
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            loseTraits: ['Force'],
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
