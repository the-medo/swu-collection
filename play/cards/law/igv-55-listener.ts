import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const igv55Listener = {
  cardId: 'igv-55-listener',
  name: 'IGV-55 Listener',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
