import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const n5SentryDroid = {
  cardId: 'n5-sentry-droid',
  name: 'N5 Sentry Droid',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['New Republic', 'Droid'],
  cost: 3,
  power: 4,
  hp: 2,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
