import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetEchoBaseDefender = {
  cardId: 'echo-base-defender',
  name: 'Echo Base Defender',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
