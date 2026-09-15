import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import { position } from './helpers.ts';
import { scenario } from './scenario.ts';
import { optionLabel } from '../../frontend/src/components/app/crossfire/presentation.ts';

test('Mystic Monastery displays its printed three-use game limit', () => {
  const p = position();
  p.players[0].base.card = 'mystic-monastery';
  const view = new Projector(p.gameId, { role: 'player', playerId: 'alice' }).project(
    scenario(p).state,
  );
  const option = view.decision!.options.find(o => o.action?.id === 'gain-force')!;
  expect(optionLabel(option, view, 'alice')).toBe('Mystic Monastery: Gain force (3 uses per game)');
});
