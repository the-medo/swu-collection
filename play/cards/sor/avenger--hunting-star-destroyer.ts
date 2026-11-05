import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAvengerHuntingStarDestroyer = {
  cardId: 'avenger--hunting-star-destroyer',
  name: 'Avenger, Hunting Star Destroyer',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 9,
  unique: true,
  power: 8,
  hp: 8,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
          chooser: 'enemy',
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
            controller: 'enemy',
            nonLeader: true,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
          chooser: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
