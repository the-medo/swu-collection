import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const ig88ProgrammedToKill = {
  cardId: 'ig-88--programmed-to-kill',
  name: 'IG-88, Programmed to Kill',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression', 'Villainy'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter'],
  unique: true,
  cost: 4,
  power: 6,
  hp: 3,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
