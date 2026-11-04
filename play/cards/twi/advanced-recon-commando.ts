import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetAdvancedReconCommando = {
  cardId: 'advanced-recon-commando',
  name: 'Advanced Recon Commando',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
