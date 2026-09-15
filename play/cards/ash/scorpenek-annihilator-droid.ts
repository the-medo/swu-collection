import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const scorpenekAnnihilatorDroid = {
  cardId: 'scorpenek-annihilator-droid',
  name: 'Scorpenek Annihilator Droid',
  kind: 'unit',
  aspects: ['Vigilance', 'Command'],
  traits: ['Underworld', 'Droid'],
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel', 'Shielded', 'Overwhelm'],
} as const satisfies UnitDefinition;
