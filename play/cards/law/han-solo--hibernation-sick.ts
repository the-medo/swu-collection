import type { UnitDefinition } from '../definition.ts';

// LAW 37. Printed text is pinned in the meta foundation fixture.
export const hanSoloHibernationSick = {
  cardId: 'han-solo--hibernation-sick',
  name: 'Han Solo, Hibernation Sick',
  kind: 'unit',
  aspects: ['Vigilance', 'Command'],
  traits: ['Rebel'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'give-self-token',
          token: 'experience',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
