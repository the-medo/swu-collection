import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-final.json.
export const wipeThemOut = {
  cardId: 'wipe-them-out',
  name: 'Wipe Them Out',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'attack-with-unit',
      powerBonus: 0,
      redirectExcess: true,
    },
  ],
} as const satisfies EventDefinition;
