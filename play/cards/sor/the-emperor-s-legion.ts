import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheEmperorSLegion = {
  cardId: 'the-emperor-s-legion',
  name: "The Emperor's Legion",
  kind: 'event',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Supply'],
  cost: 2,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'owner',
      filter: {
        kind: 'unit',
        defeatedThisPhase: true,
      },
      min: {
        kind: 'zone-size',
        zone: 'discard',
        player: 'self',
        filter: {
          kind: 'unit',
          defeatedThisPhase: true,
        },
      },
      max: {
        kind: 'zone-size',
        zone: 'discard',
        player: 'self',
      },
      bind: 'card',
      effects: [
        {
          kind: 'move-cards',
          group: 'chosen',
          from: 'discard',
          to: 'hand',
        },
      ],
      group: 'chosen',
    },
  ],
} as const satisfies EventDefinition;
