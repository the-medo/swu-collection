import type { ContinuationCase } from './continuations.ts';
import {
  attack,
  choose,
  ids,
  play,
  position,
  resources,
  scenario,
  step,
  target,
} from './ic27-helpers.ts';

export function earlySetContinuations(): ContinuationCase[] {
  const cases: ContinuationCase[] = [];
  const record = (
    name: string,
    description: string,
    state: ContinuationCase['state'],
    input: ContinuationCase['input'],
  ) => cases.push({ name, description, state, input });
  function hand(card: string) {
    const p = position();
    p.players[0].resources = resources();
    p.players[0].hand = [{ card, ref: 'card' }];
    return p;
  }
  {
    const p = hand('clone');
    p.players[1].ground = [{ card: ids.marine, ref: 'original' }];
    const g = scenario(p),
      state = play(g.state, g.refs.card!);
    record(
      'early-clone-entry',
      'Choose the printed identity before a paid Clone enters play',
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.original),
    );
  }
  {
    const p = position();
    p.players[0].ground = [{ card: 'darth-maul--revenge-at-last', ref: 'maul' }];
    p.players[1].ground = [
      { card: ids.marine, ref: 'one' },
      { card: ids.marine, ref: 'two' },
    ];
    const g = scenario(p),
      state = attack(g.state, g.refs.maul!, g.refs.one!);
    record(
      'early-maul-second-defender',
      'Complete a single attack declaration with two defending units',
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.two),
    );
  }
  {
    const p = position();
    p.players[0].ground = [{ card: 'darth-maul--revenge-at-last', ref: 'maul' }];
    p.players[1].ground = [
      { card: ids.marine, ref: 'one' },
      { card: ids.marine, ref: 'two' },
    ];
    p.attachments = [
      { card: 'shield', unit: 'maul', ref: 'shield1' },
      { card: 'shield', unit: 'maul' },
    ];
    const g = scenario(p);
    const state = target(attack(g.state, g.refs.maul!, g.refs.one!), g.refs.two!);
    record(
      'early-maul-combat-shields',
      'Replace one of two simultaneous counterattacks while all damage is pending',
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.shield1),
    );
  }
  {
    const p = hand('count-dooku--fallen-jedi');
    p.players[0].ground = [
      { card: ids.marine, ref: 'one' },
      { card: ids.marine, ref: 'two' },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    const g = scenario(p);
    const state = target(
      step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.one!, g.refs.two!]),
      g.refs.target!,
    );
    record(
      'early-dooku-group-damage',
      'Retain exploited power and a previous target while choosing the next simultaneous damage assignment',
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.target),
    );
  }
  {
    const p = hand('bamboozle');
    p.players[0].hand!.push({ card: 'waylay', ref: 'payment' });
    const g = scenario(p);
    const state = step(
      play(g.state, g.refs.card!),
      i => i.kind === 'choose-mode' && i.mode === 'discard-instead',
    );
    record(
      'early-alternative-event-cost',
      'Discard a Cunning card instead of paying the event’s other costs',
      state,
      choose(state, 'accept-effect', [g.refs.payment!]),
    );
  }
  {
    const p = position();
    p.players[0].resources = [
      ...resources(),
      { card: 'first-light--headquarters-of-the-crimson-dawn', ref: 'ship' },
    ];
    p.players[0].ground = [{ card: ids.consular, ref: 'payment' }];
    p.attachments = [
      { card: 'shield', unit: 'payment', ref: 'shield1' },
      { card: 'shield', unit: 'payment' },
    ];
    const g = scenario(p);
    let state = step(g.state, i => i.kind === 'play' && i.card === g.refs.ship && !!i.smuggle);
    record(
      'early-additional-play-cost',
      'Choose a friendly unit for an additional damage payment',
      state,
      choose(state, 'accept-effect', [g.refs.payment!]),
    );
    state = step(state, 'accept-effect', [g.refs.payment!]);
    record(
      'early-additional-cost-shield',
      'Resolve damage replacement before the Smuggled unit enters play',
      state,
      choose(state, i => i.kind === 'target' && i.card === g.refs.shield1),
    );
  }
  {
    const p = hand('don-t-get-cocky');
    p.players[0].deck = [{ card: ids.marine }, { card: ids.fighter }];
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    const g = scenario(p),
      state = target(play(g.state, g.refs.card!), g.refs.target!);
    record(
      'early-incremental-reveal',
      'Continue a reveal without disclosing the next card in advance',
      state,
      choose(state, i => i.kind === 'choose-mode' && i.mode === 'continue'),
    );
  }
  {
    const p = hand('smoke-and-cinders');
    p.players[0].hand!.push(
      ...Array.from({ length: 3 }, (_, n) => ({ card: ids.marine, ref: `a${n}` })),
    );
    p.players[1].hand = Array.from({ length: 3 }, (_, n) => ({ card: ids.fighter, ref: `b${n}` }));
    const g = scenario(p),
      state = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.a0!]);
    record(
      'early-simultaneous-hand-discard',
      'Preserve a private first choice until the second player selects and both hands discard together',
      state,
      choose(state, 'accept-effect', [g.refs.b0!]),
    );
  }
  {
    const p = position();
    p.players[0].ground = [{ card: 'zorii-bliss--valiant-smuggler', ref: 'zorii' }];
    const g = scenario(p);
    const state = step(step(attack(g.state, g.refs.zorii!), 'pass'), 'pass');
    record(
      'early-delayed-unit-origin',
      'Retain a unit ability origin through a regroup-phase discard suspension',
      state,
      choose(state, 'accept-effect', state.execution.decision!.selection!.cards.slice(0, 1)),
    );
  }
  return cases;
}
