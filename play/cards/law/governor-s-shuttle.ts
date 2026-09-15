import type { UnitDefinition } from '../definition.ts';
// Both choices are collected before any selected unit is defeated. The first
// selection remains in server-only bindings until the shared defeat resolves.
export const governorSShuttle = {
  cardId: 'governor-s-shuttle',
  name: "Governor's Shuttle",
  kind: 'unit',
  cost: 5,
  power: 2,
  hp: 4,
  arena: 'space',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  triggers: [
    {
      id: 'each-player-unit',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          chooser: 'self',
          filter: { controller: 'friendly' },
          bind: 'mine',
          optional: false,
          allowMissing: true,
          effects: [
            {
              kind: 'select-unit',
              chooser: 'enemy',
              filter: { controller: 'enemy' },
              bind: 'theirs',
              optional: false,
              allowMissing: true,
              effects: [{ kind: 'defeat-bound', targets: ['mine', 'theirs'] }],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
