import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const uscruEntertainmentDistrict = {
  cardId: 'uscru-entertainment-district',
  name: 'Uscru Entertainment District',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 30,
} as const satisfies BaseDefinition;
