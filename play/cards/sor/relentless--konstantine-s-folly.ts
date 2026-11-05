import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRelentlessKonstantineSFolly = {
  cardId: 'relentless--konstantine-s-folly',
  name: "Relentless, Konstantine's Folly",
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 9,
  unique: true,
  power: 8,
  hp: 8,
  arena: 'space',
  blankFirstEnemyEvent: true,
} as const satisfies UnitDefinition;
