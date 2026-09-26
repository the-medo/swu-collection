import { randomUUID } from 'node:crypto';
import { historyFixture } from '../history-fixture.ts';
import { LocalGame } from '../../host/session.ts';
import { leagueRoster } from '../../ai/full-game/roster.ts';
import { encodeTrajectory, decodeTrajectory } from '../../ai/datasets/trajectory.ts';
import { humanExamples } from '../../ai/datasets/examples.ts';
import { sha256 } from '../../ai/releases/objects.ts';
import { Projector } from '../../projection/projector.ts';
import { CommandBuilder } from '../../ai/full-game/choices.ts';
import type { GameConfig } from '../../engine/state.ts';

export function humanFixture() {
  const gameId = `game-${randomUUID()}`;
  const decks = [leagueRoster[5]!.snapshot, leagueRoster[1]!.snapshot].map(d => ({
    leader: d.leader,
    base: d.base,
    mainboard: d.mainboard.map(c => ({ ...c })),
  }));
  const game = new LocalGame(
    {
      gameId,
      players: decks.map((d, i) => ({
        id: `p${i + 1}`,
        leader: d.leader,
        base: d.base,
        deck: d.mainboard,
      })) as GameConfig['players'],
    },
    () => 0,
  );
  const fixture = historyFixture(gameId, game.state);
  const projectors = ['p1', 'p2'].map(
    playerId => new Projector(gameId, { role: 'player', playerId }),
  );
  for (let i = 0; i < 10; i++) {
    const seat = fixture.state.execution.decision!.playerId === 'p1' ? 0 : 1;
    const projector = projectors[seat]!;
    const builder = new CommandBuilder(projector.project(fixture.state));
    while (builder.stage !== 'done') builder.choose(builder.choices()[0]!);
    fixture.submit(projector.command(fixture.state, builder.command()));
  }
  fixture.finish();
  const metadata = {
    exportId: randomUUID(),
    groupId: 'a'.repeat(64),
    createdAt: new Date().toISOString(),
  };
  return { fixture, decks, metadata };
}
