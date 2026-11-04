import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetTwinPodCloudCar = {
  cardId: 'twin-pod-cloud-car',
  name: 'Twin Pod Cloud Car',
  kind: 'unit',
  aspects: [],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'space',
  restore: 2,
} as const satisfies UnitDefinition;
