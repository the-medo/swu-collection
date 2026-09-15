import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-passives.json.
export const exiledFromTheForce = {
  cardId: 'exiled-from-the-force',
  name: 'Exiled from the Force',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Condition'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  hostLosesTraits: ['Force'],
  hostOnlyGrit: true,
  grants: {
    keywords: ['Grit'],
  },
} as const satisfies UpgradeDefinition;
