import type { UpgradeDefinition } from '../definition.ts';

// Reprinted in IC27 133; identity and text follow the official catalog.
export const ic27ReprintInfiltratorSSkill = {
  cardId: 'infiltrator-s-skill',
  name: "Infiltrator's Skill",
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    keywords: ['Saboteur'],
  },
} as const satisfies UpgradeDefinition;
