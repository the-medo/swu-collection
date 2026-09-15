import type { UnitDefinition } from '../definition.ts';

// JTL 038. Conversion keeps the card in play and uses this attachment ability's restriction.
export const corvusInfernoSquadronRaider = {
  cardId: 'corvus--inferno-squadron-raider',
  name: 'Corvus, Inferno Squadron Raider',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  restore: 2,
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [{ kind: 'attach-pilot', host: 'source', optional: true }],
    },
  ],
} as const satisfies UnitDefinition;
