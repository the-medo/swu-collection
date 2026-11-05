import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRuthlessness = {
  cardId: 'ruthlessness',
  name: 'Ruthlessness',
  kind: 'upgrade',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Innate'],
  cost: 1,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'attack-defeated-unit',
        timing: 'attack-defeated-unit',
        effects: [
          {
            kind: 'damage-base',
            amount: 2,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
