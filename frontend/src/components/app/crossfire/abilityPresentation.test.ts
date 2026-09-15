import { expect, test } from 'bun:test';
import cards from '../../../../../server/db/json/card-list.json';
import type { GameView, VisibleDecision } from '../../../../../play/view/types.ts';
import { decisionDescription, triggerPresentation } from './abilityPresentation.ts';
const source = (cardId: string) => ({ cardId, name: cardId, currentCardId: null });
const view = {
  cards: [],
  decision: { source: source('ahsoka-tano--trust-in-the-force') },
} as unknown as GameView;
test('Ahsoka target selection explains her leader ability without the activation cost prefix', () => {
  expect(decisionDescription(view, cards)).toBe(
    'Choose a unit with less power than a friendly unit. It gets +2/+0 for this phase.',
  );
});
test('printed trigger text distinguishes Anakin’s two conditions and Shuttle’s Shielded', () => {
  const option = (cardId: string, id: string, index = 0) =>
    ({
      kind: 'trigger',
      ability: { id, timing: 'played', index, source: source(cardId), grantedBy: null },
    }) as VisibleDecision['options'][number];
  expect(
    triggerPresentation(
      option('shuttle-st-149--under-krennic-s-authority', 'shielded-played'),
      view,
      cards,
    ),
  ).toMatchObject({ title: 'Shielded', description: 'Give this unit a Shield token.' });
  const first = triggerPresentation(
    option('anakin-skywalker--champion-of-mortis', 'discard-heroism'),
    view,
    cards,
  );
  const second = triggerPresentation(
    option('anakin-skywalker--champion-of-mortis', 'discard-villainy', 1),
    view,
    cards,
  );
  expect(first.description.toLowerCase()).toContain('heroism');
  expect(second.description.toLowerCase()).toContain('villainy');
  expect(first.description).not.toBe(second.description);
});

test('Grogu’s printed deployment trigger is read from the leader deployment box', () => {
  const option = {
    kind: 'trigger',
    ability: {
      id: 'unique-play',
      timing: 'friendly-played',
      index: 0,
      source: { ...source('grogu--charming-companion'), side: 'front' },
      grantedBy: null,
    },
  } as VisibleDecision['options'][number];
  expect(triggerPresentation(option, view, cards)).toMatchObject({
    title: 'Deploy Grogu',
    description:
      'When you play a unique unit that costs 4 or more: If this leader is ready, you may deploy him.',
  });
});
