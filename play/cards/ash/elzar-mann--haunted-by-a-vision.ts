import type { UnitDefinition } from '../definition.ts';
export const elzarMannHauntedByAVision = {
  cardId: 'elzar-mann--haunted-by-a-vision',
  name: 'Elzar Mann, Haunted by a Vision',
  kind: 'unit',
  unique: true,
  cost: 6,
  power: 3,
  hp: 7,
  arena: 'ground',
  aspects: ['Cunning'],
  traits: ['Force', 'Jedi'],
  entersReady: { kind: 'controls-leader-trait', trait: 'Force' },
  triggers: [
    {
      id: 'played-advantage',
      timing: 'played',
      effects: [
        {
          kind: 'distribute',
          benefit: 'advantage',
          amount: 5,
          filter: { controller: 'friendly', otherThan: 'source' },
          bind: 'distributed',
          effects: [
            {
              kind: 'search-deck',
              player: 'enemy',
              count: { kind: 'value', name: 'distributed', multiplier: 2 },
              filter: 'event',
              max: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
