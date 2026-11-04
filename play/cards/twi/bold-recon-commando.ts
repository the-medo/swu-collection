import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetBoldReconCommando = {
  cardId: 'bold-recon-commando',
  name: 'Bold Recon Commando',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
