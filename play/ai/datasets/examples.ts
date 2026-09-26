import { isDeepStrictEqual } from 'node:util';
import { CommandBuilder, makeNameChoices, type Candidate } from '../full-game/choices.ts';
import { VisibleMemory, leagueEncoding } from '../full-game/encoding.ts';
import { leagueRoster } from '../full-game/roster.ts';
import { leagueGameContract, rosterEnvironment } from '../full-game/game.ts';
import type { TrainingRoster } from '../full-game/training-roster.ts';
import type { ViewCommand } from '../../view/types.ts';
import { canonicalJson } from '../../cards/catalog.ts';
import { privateList, type Trajectory } from './trajectory.ts';

export function humanChoice(
  builder: CommandBuilder,
  command: ViewCommand,
  candidates: Candidate[],
) {
  const selections = command.selections ?? [];
  const number = command.chosenNumber === 0 ? '' : String(command.chosenNumber);
  const index = candidates.findIndex(c => {
    if (builder.stage === 'option') return c.kind === 'option' && c.option.id === command.optionId;
    if (builder.stage === 'name') return c.kind === 'name' && c.cardId === command.namedCardId;
    if (builder.stage === 'number')
      return builder.digits.length < number.length
        ? c.kind === 'digit' && String(c.digit) === number[builder.digits.length]
        : c.kind === 'finish';
    if (builder.stage === 'selection')
      return builder.selected.length === selections.length
        ? c.kind === 'finish'
        : c.kind === 'select' &&
            selections.slice(builder.selected.length, builder.selected.length + c.quantity)
              .length === c.quantity &&
            selections
              .slice(builder.selected.length, builder.selected.length + c.quantity)
              .every(id => id === c.card);
    return false;
  });
  if (index < 0) throw new Error('Human command is not representable by this action adapter');
  return index;
}
export function* humanExamples(trajectory: Trajectory, roster?: TrainingRoster) {
  const environment = roster ? rosterEnvironment(roster) : undefined;
  const contract = environment?.contract ?? leagueGameContract;
  if (!isDeepStrictEqual(trajectory.versions, contract.versions))
    throw new Error('Human game requires its matching engine/card training target');
  const encoding = environment?.encoding ?? leagueEncoding;
  const decks = environment?.roster.decks ?? leagueRoster;
  const listKey = (deck: unknown) => canonicalJson(privateList.parse(deck));
  const keys = decks.map(d =>
    listKey({ leader: d.snapshot.leader, base: d.snapshot.base, mainboard: d.snapshot.mainboard }),
  );
  const indices = trajectory.players.map(p => keys.indexOf(listKey(p.deck)));
  if (indices.every(i => i < 0))
    throw new Error('Add at least one of the human decks to this training roster first');
  const memories = [new VisibleMemory(), new VisibleMemory()];
  const names = makeNameChoices(trajectory.titles);
  for (const frame of trajectory.frames) {
    const seat = frame.seat === 'p1' ? 0 : 1;
    memories[seat]!.observe(frame.view, frame.seat);
    if (!frame.command || indices[seat]! < 0) continue;
    const builder = new CommandBuilder(frame.view, names);
    const rows = [];
    for (let step = 0; builder.stage !== 'done'; step++) {
      if (step > 1024) throw new Error('Human command exceeds adapter capacity');
      const choices = builder.choices();
      const action = humanChoice(builder, frame.command, choices);
      if (choices.length > 1)
        rows.push({
          context: encoding.encodeContext(
            frame.view,
            frame.seat,
            indices[seat]!,
            memories[seat]!,
            builder,
          ),
          candidates: choices.map(c => encoding.encodeCandidate(builder, c, frame.seat)),
          action,
          seat,
          return:
            trajectory.result.winner === null
              ? 0
              : trajectory.result.winner === frame.seat
                ? 1
                : -1,
        });
      builder.choose(choices[action]!);
    }
    if (
      !isDeepStrictEqual(builder.command(), {
        ...frame.command,
        selections: frame.command.selections ?? [],
      })
    )
      throw new Error('Human command roundtrip mismatch');
    yield* rows;
  }
}
