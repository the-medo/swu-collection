import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteNamelessValor = {
  cardId: 'nameless-valor',
  name: 'Nameless Valor',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  attachFilter: {
    token: true,
  },
  grants: {
    keywords: ['Overwhelm'],
  },
} as const satisfies UpgradeDefinition;
