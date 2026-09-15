import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-attributes.json.
export const malakiliKeeperOfTheMenagerie = {
  cardId: 'malakili--keeper-of-the-menagerie',
  name: 'Malakili, Keeper of the Menagerie',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  traitGrants: [
    {
      fromTrait: 'Creature',
      trait: 'Underworld',
      outsidePlay: true,
    },
  ],
} as const satisfies UnitDefinition;
