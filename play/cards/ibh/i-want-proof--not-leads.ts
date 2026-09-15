import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const iWantProofNotLeads = {
  cardId: 'i-want-proof--not-leads',
  name: 'I Want Proof, Not Leads',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'draw-cards',
      amount: 2,
    },
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: 1,
      max: 1,
      bind: 'discarded',
      group: 'discarded-cards',
      effects: [
        {
          kind: 'move-cards',
          group: 'discarded-cards',
          from: 'hand',
          to: 'discard',
          discardBy: 'owner',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
