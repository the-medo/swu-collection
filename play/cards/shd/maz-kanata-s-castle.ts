import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const mazKanataSCastle = {
  cardId: 'maz-kanata-s-castle',
  kind: 'base',
  name: "Maz Kanata's Castle",
  aspects: ['Command'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
