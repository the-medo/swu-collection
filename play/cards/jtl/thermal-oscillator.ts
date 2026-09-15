import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const thermalOscillator = {
  cardId: 'thermal-oscillator',
  kind: 'base',
  name: 'Thermal Oscillator',
  aspects: ['Aggression'],
  traits: [],
  hp: 27,
  minimumDeckIncrease: -5,
} as const satisfies BaseDefinition;
