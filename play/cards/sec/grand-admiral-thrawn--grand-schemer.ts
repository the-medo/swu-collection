import type { UnitDefinition } from '../definition.ts';
export const grandAdmiralThrawnGrandSchemer = {
  cardId: 'grand-admiral-thrawn--grand-schemer',
  name: 'Grand Admiral Thrawn, Grand Schemer',
  kind: 'unit',
  unique: true,
  cost: 7,
  power: 8,
  hp: 7,
  arena: 'ground',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Official'],
  triggers: [
    {
      id: 'played-capture',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          chooser: 'enemy',
          filter: { controller: 'enemy', nonLeader: true },
          bind: 'offered',
          optional: true,
          effects: [{ kind: 'capture-unit', guard: 'source', target: 'offered' }],
          otherwise: [{ kind: 'on-unit', target: 'source', operation: { kind: 'ready' } }],
        },
      ],
    },
    {
      id: 'defeated-capture',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: { controller: 'friendly' },
          bind: 'guard',
          optional: false,
          effects: [
            {
              kind: 'select-unit',
              filter: { controller: 'enemy', nonLeader: true, sameArenaAs: 'guard' },
              bind: 'prisoner',
              optional: false,
              effects: [{ kind: 'capture-unit', guard: 'guard', target: 'prisoner' }],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
