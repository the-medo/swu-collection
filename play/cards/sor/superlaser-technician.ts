import type { UnitDefinition } from '../definition.ts';

// Official July 20, 2026 templating: resource this unit and ready it (details/105).
export const superlaserTechnician = {
  cardId: 'superlaser-technician',
  traits: ['Imperial'],
  name: 'Superlaser Technician',
  kind: 'unit',
  cost: 3,
  power: 2,
  hp: 1,
  arena: 'ground',
  aspects: ['Villainy', 'Command'],

  triggers: [{ id: 'when-defeated', timing: 'defeated', effects: [{ kind: 'self-resource' }] }],
} as const satisfies UnitDefinition;
