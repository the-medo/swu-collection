import type { LeaderDefinition } from '../definition.ts';

// SOR 014. Only the faceup face supplies abilities (v8 §3.4.3).
// The deployment effect has a condition; its action has no payment cost.
export const sabineWren = {
  cardId: 'sabine-wren--galvanized-revolutionary',
  traits: ['Mandalorian', 'Rebel', 'Spectre'],
  name: 'Sabine Wren, Galvanized Revolutionary',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'damage-bases',
          costs: [{ kind: 'exhaust-self' }],
          limit: null,
          effects: [{ kind: 'damage-bases', amount: 1, targets: 'each' }],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            { kind: 'deploy', as: 'unit', condition: { kind: 'resources-at-least', amount: 4 } },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
      triggers: [
        {
          id: 'on-attack',
          timing: 'attack',
          effects: [{ kind: 'damage-bases', amount: 1, targets: 'enemy' }],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
