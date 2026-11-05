import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRuthlessRaider = {
  cardId: 'ruthless-raider',
  name: 'Ruthless Raider',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: {
            controller: 'enemy',
          },
          max: 1,
          mandatory: true,
          bases: 'enemy',
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: {
            controller: 'enemy',
          },
          max: 1,
          mandatory: true,
          bases: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
