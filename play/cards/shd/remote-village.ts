import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const remoteVillage = {
  cardId: 'remote-village',
  kind: 'base',
  name: 'Remote Village',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
