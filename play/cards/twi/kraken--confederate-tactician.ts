import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKrakenConfederateTactician = {
  cardId: 'kraken--confederate-tactician',
  name: 'Kraken, Confederate Tactician',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 5,
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 2,
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'friendly',
            token: true,
          },
          operation: {
            kind: 'modify',
            power: 1,
            hp: 1,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
