import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const notiNomad = {
  cardId: 'noti-nomad',
  name: 'Noti Nomad',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
