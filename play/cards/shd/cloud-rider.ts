import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCloudRider = {
  cardId: 'cloud-rider',
  name: 'Cloud-Rider',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
