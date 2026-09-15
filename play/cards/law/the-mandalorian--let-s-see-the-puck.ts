import type { UnitDefinition } from '../definition.ts';
export const theMandalorianLetsSeeThePuck = {
  cardId: 'the-mandalorian--let-s-see-the-puck',
  name: "The Mandalorian, Let's See the Puck",
  kind: 'unit',
  unique: true,
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'ground',
  aspects: ['Vigilance', 'Aggression'],
  traits: ['Mandalorian', 'Bounty Hunter'],
  triggers: [
    { id: 'played-draw', timing: 'played', effects: [{ kind: 'draw-cards', amount: 1 }] },
    {
      id: 'draw-shield',
      timing: 'cards-drawn',
      condition: { kind: 'phase', phase: 'action' },
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: { kind: 'give-token', token: 'shield', count: 1 },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
