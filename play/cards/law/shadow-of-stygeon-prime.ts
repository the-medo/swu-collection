import type { UpgradeDefinition } from '../definition.ts';
export const shadowOfStygeonPrime = {
  cardId: 'shadow-of-stygeon-prime',
  name: 'Shadow of Stygeon Prime',
  kind: 'upgrade',
  token: false,
  cost: 4,
  aspects: ['Aggression', 'Cunning', 'Villainy'],
  traits: ['Condition'],
  modifiers: { power: 0, hp: 0 },
  attachTo: 'unit',
  attachFilter: { nonLeader: true },
  hostCannotReady: true,
  grants: {
    triggers: [
      {
        id: 'regroup-damage',
        timing: 'regroup-start',
        effects: [{ kind: 'damage-own-base', amount: 2 }],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
