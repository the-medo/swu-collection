import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCaptainRexLeadByExample = {
  cardId: 'captain-rex--lead-by-example',
  name: 'Captain Rex, Lead by Example',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 6,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
