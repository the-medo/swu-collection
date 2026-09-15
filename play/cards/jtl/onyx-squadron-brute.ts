import type { UnitDefinition } from '../definition.ts';

export const onyxSquadronBrute = {
  cardId: 'onyx-squadron-brute',
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  name: 'Onyx Squadron Brute',
  kind: 'unit',
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  aspects: ['Vigilance', 'Villainy'],

  triggers: [
    { id: 'when-defeated', timing: 'defeated', effects: [{ kind: 'heal-base', amount: 2 }] },
  ],
} as const satisfies UnitDefinition;
