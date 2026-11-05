import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSnapshotReflexes = {
  cardId: 'snapshot-reflexes',
  name: 'Snapshot Reflexes',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'attack-bound',
          target: 'attached',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
