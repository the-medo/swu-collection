import assert from 'node:assert/strict';
import type { ScenarioInput } from '../../testing/scenario.ts';
import { leagueRoster } from '../full-game/roster.ts';
import { cardDefinition } from '../../cards/registry.ts';
import { spendableCredits } from '../../engine/credits.ts';
import { effectiveAbilities } from '../../engine/effective-abilities.ts';
import {
  type Exercise,
  type Step,
  play,
  target,
  ability,
  pay,
  pass,
  attack,
  sacrifice,
  step,
} from './runner.ts';

const C = {
  krennic: 'director-krennic--on-the-verge-of-greatness',
  ant: 'ant-droid',
  merc: 'expendable-mercenary',
  carrier: 'resupply-carrier',
  chim: 'chimaera--a-frightening-reality',
  disaster: 'hyperspace-disaster',
  commando: 'imperial-armored-commando',
  koska: 'koska-reeves--warrior-of-mandalore',
  door: 'imperial-door-technician',
  arvel: 'arvel-skeen--win-and-walk-away',
  galen: 'galen-erso--you-ll-never-win',
  nemik: 'karis-nemik--freedom-is-a-pure-idea',
  hauler: 'stolen-at-hauler',
  wing: 'a-wing',
  squadron: 'snub-fighter-squadron',
} as const;
type Placement = NonNullable<ScenarioInput['players'][0]['hand']>[number];
const card = (key: keyof typeof C, exhausted = false): Placement => ({
  card: C[key],
  ref: key,
  exhausted,
});
type Position = {
  round?: number;
  resources: number;
  ready?: number;
  credits?: number;
  hp?: number;
  hand?: Placement[];
  ground?: Placement[];
  space?: Placement[];
  top?: Placement[];
  enemyGround?: Placement[];
  enemySpace?: Placement[];
  enemyHand?: Placement[];
  enemyResources?: number;
  enemyHp?: number;
  opponent?: string;
  extraEnemy?: string;
  active?: 'p1' | 'p2';
  leaderExhausted?: boolean;
  attachments?: ScenarioInput['attachments'];
};

/** Partition the exact registered lists; stress opponents explicitly replace one card. */
function position(id: string, p: Position): ScenarioInput {
  const players = [0, 1].map(seat => {
    const roster = leagueRoster.find(
      d => d.key === (seat === 0 ? 'krennic' : (p.opponent ?? 'vader')),
    )!;
    const pool = roster.snapshot.mainboard.flatMap(c =>
      Array.from({ length: c.quantity }, () => c.cardId),
    );
    if (seat && p.extraEnemy) {
      pool.pop();
      pool.push(p.extraEnemy);
    }
    const take = (entries: Placement[]) =>
      entries.map(entry => {
        const index = pool.indexOf(entry.card);
        assert(index >= 0, `${id}: list lacks ${entry.card}`);
        pool.splice(index, 1);
        return entry;
      });
    const hand = take(seat ? (p.enemyHand ?? []) : (p.hand ?? []));
    const ground = take(seat ? (p.enemyGround ?? []) : (p.ground ?? []));
    const space = take(seat ? (p.enemySpace ?? []) : (p.space ?? []));
    const top = take(seat ? [] : (p.top ?? []));
    const count = seat ? (p.enemyResources ?? p.resources) : p.resources;
    const resources = Array.from({ length: count }, (_, i) => {
      const card = pool.pop();
      assert(card);
      return { card, exhausted: !seat && i >= (p.ready ?? count) };
    });
    const base = cardDefinition(roster.snapshot.base);
    assert.equal(base.kind, 'base');
    const hp = 'hp' in base ? base.hp : 30;
    return {
      id: seat ? 'p2' : 'p1',
      base: {
        card: roster.snapshot.base,
        ref: seat ? 'enemy-base' : 'base',
        damage: hp - (seat ? (p.enemyHp ?? hp) : (p.hp ?? hp)),
      },
      leader: {
        card: roster.snapshot.leader,
        ref: seat ? 'enemy-leader' : 'leader',
        exhausted: !seat && !!p.leaderExhausted,
      },
      credits: seat ? [] : Array.from({ length: p.credits ?? 0 }, (_, i) => `credit${i + 1}`),
      hand,
      ground,
      space,
      resources,
      deck: [...top, ...pool.map(card => ({ card }))],
    };
  }) as ScenarioInput['players'];
  return {
    gameId: `krennic-practice-${id}`,
    players,
    round: p.round ?? 3,
    attachments: p.attachments,
    activePlayer: p.active ?? 'p1',
    initiative: { holder: 'p1' },
  };
}
const p2 = (s: Step): Step => ({ ...s, actor: 'p2' });
const next = { nextRound: true } as const;
const wait = p2(pass());
const accept = { ...step('accept-effect'), label: 'Accept the exhausted resource gain' };

export const krennicExercises: Exercise[] = [
  {
    id: 'opening',
    title: 'The full four-round ramp opening',
    skill: 'Sequence a delayed payoff',
    opponent: 'Vader',
    question: 'Can you reach seven real resources on round four while retaining a Credit?',
    assumptions:
      'Scripted unpressured line: opponent passes. Starting hand has exactly four cards; Ant Droid draws the staged Chimaera. Regroup adds one resource each round. This proves the curve is legal, not that passing opponents are realistic.',
    input: position('opening', {
      round: 1,
      resources: 2,
      hand: [card('krennic'), card('ant'), card('merc'), card('carrier')],
      top: [card('chim')],
    }),
    lines: [
      {
        label: 'Reference line',
        reason:
          'Mercenary must die on round two: its exhausted resource and a second Credit make Carrier reachable on round three.',
        steps: [
          play('krennic'),
          wait,
          play('ant'),
          wait,
          ...sacrifice('ant'),
          wait,
          next,
          play('merc'),
          pay(),
          wait,
          ...sacrifice('merc'),
          accept,
          wait,
          next,
          play('carrier'),
          pay(['credit1']),
          accept,
          wait,
          next,
          play('chim'),
          pay(),
        ],
        check: r => {
          assert.equal(r.state.round, 4);
          assert.equal(r.count(), 7);
          assert.equal(r.credits(), 1);
          assert.equal(r.card('merc').zone, 'resources');
          assert.equal(r.card('carrier').zone, 'space');
          assert.equal(r.card('chim').zone, 'space');
          assert.equal(r.ready(), 0);
        },
      },
    ],
  },
  {
    id: 'discount-once',
    title: 'The unit discount is only once per round',
    skill: 'Track a used discount',
    opponent: 'Vader',
    question: 'With no ready resources, can the Krennic unit make both Ant Droids free this round?',
    assumptions:
      'The Krennic unit is already in play; its first qualifying play reduction is unused. All three real resources are exhausted. The leader is ready and the opponent passes.',
    input: position('discount-once', {
      resources: 3,
      ready: 0,
      hand: [card('ant'), { card: C.ant, ref: 'ant2' }],
      ground: [card('krennic', true)],
    }),
    lines: [
      {
        label: 'Discount is spent',
        reason: 'The first Ant is free; the second is not offered at zero spending power.',
        steps: [play('ant'), wait],
        check: r => {
          assert.equal(r.ready(), 0);
          assert(!r.available(play('ant2')));
        },
      },
      {
        label: 'Pay for the second Ant',
        reason:
          'Sacrifice the first Ant for a Credit, then spend it on the second Ant. The leader is now exhausted and cannot repeat the sacrifice this round.',
        steps: [play('ant'), wait, ...sacrifice('ant'), wait, play('ant2'), pay('credits')],
        check: r => {
          assert.equal(r.card('ant2').zone, 'ground');
          assert.equal(r.credits(), 0);
          assert.equal(r.card('leader').exhausted, true);
        },
      },
    ],
  },
  {
    id: 'missing-discount',
    title: 'The Krennic unit is missing',
    skill: 'Adapt payment to the actual board',
    opponent: 'Vader',
    question:
      'You have three resources and a Credit, but no Krennic unit. How do you play Mercenary?',
    assumptions:
      'The one-resource discount is absent. Mercenary costs four, so the saved Credit covers the shortfall.',
    input: position('missing-discount', {
      round: 2,
      resources: 3,
      credits: 1,
      hand: [card('merc')],
    }),
    lines: [
      {
        label: 'Reference line',
        reason: 'Spend exactly one Credit; do not assume the discounted cost always applies.',
        steps: [play('merc'), pay(['credit1'])],
        check: r => {
          assert.equal(r.card('merc').zone, 'ground');
          assert.equal(r.credits(), 0);
          assert.equal(r.ready(), 0);
        },
      },
    ],
  },
  {
    id: 'space-wipe',
    title: 'Sacrifice toward an immediate space clear',
    skill: 'Ramp for a specific payoff',
    opponent: 'Vader',
    question:
      'Five ready resources, one Credit, an exhausted Mercenary, and Hyperspace Disaster in hand. Can you clear the ships this round?',
    assumptions:
      'Your base has 12 HP. The opponent attacks for four between your sacrifice and the wipe; taking that hit is survivable. No opponent disruption is scripted.',
    input: position('space-wipe', {
      resources: 5,
      credits: 1,
      hp: 12,
      hand: [card('disaster')],
      ground: [card('merc', true)],
      enemySpace: [card('hauler'), card('wing', true)],
    }),
    lines: [
      {
        label: 'Reference line',
        reason:
          'Sacrifice Mercenary, absorb one attack, then spend five resources plus two Credits on Disaster. The new real resource is exhausted and cannot pay now.',
        steps: [
          ...sacrifice('merc'),
          accept,
          p2(attack('hauler', 'base')),
          play('disaster'),
          pay('credits'),
        ],
        check: r => {
          assert.equal(r.count(), 6);
          assert.equal(r.ready(), 0);
          assert.equal(r.credits(), 0);
          assert.equal(r.card('hauler').zone, 'discard');
          assert.equal(r.card('wing').zone, 'discard');
          assert.equal(r.damage(), 22);
          assert.equal(r.state.result, null);
        },
      },
    ],
  },
  {
    id: 'sentinel-first',
    title: 'Ground lethal: defend before ramping',
    skill: 'Survival takes priority over ramp',
    opponent: 'Greef',
    question:
      'At 3 base HP, with four resources and two Credits, do you play Armored Commando or Resupply Carrier?',
    assumptions:
      'A ready Karis Nemik threatens three ground damage. It has no Saboteur and no removal is scripted. The opponent can attack immediately after your play.',
    input: position('sentinel-first', {
      resources: 4,
      credits: 2,
      hp: 3,
      opponent: 'greef',
      hand: [card('commando'), card('carrier')],
      enemyGround: [card('nemik')],
    }),
    lines: [
      {
        label: 'Survive',
        reason:
          'Play the shielded ground Sentinel and keep both Credits; the attacker must hit it.',
        steps: [play('commando'), pay()],
        check: r => {
          assert(!r.available(attack('nemik', 'base')));
          assert(r.available(attack('nemik', 'commando')));
          assert.equal(r.credits(), 2);
          assert.equal(r.state.result, null);
        },
      },
      {
        label: 'Losing comparison',
        reason:
          'Carrier adds a resource but cannot intercept a ground attack; Nemik ends the game.',
        steps: [play('carrier'), pay('credits'), accept, p2(attack('nemik', 'base'))],
        check: r => assert.equal(r.state.result?.winner, 'p2'),
      },
    ],
  },
  {
    id: 'too-late-to-sacrifice',
    title: 'Ramp would take one action too many',
    skill: 'Respect alternating actions',
    opponent: 'Vader',
    question:
      'You already have seven ready resources. Wipe space now, or sacrifice Ant Droid first for value?',
    assumptions:
      'Your base has 4 HP and a ready Snub Fighter Squadron attacks for four. A spare Credit or extra card is worthless if the opponent wins before your next action.',
    input: position('too-late-to-sacrifice', {
      resources: 7,
      hp: 4,
      hand: [card('disaster')],
      ground: [card('ant', true)],
      enemySpace: [card('squadron')],
    }),
    lines: [
      {
        label: 'Survive',
        reason: 'Play Hyperspace Disaster immediately.',
        steps: [play('disaster')],
        check: r => {
          assert.equal(r.card('squadron').zone, 'discard');
          assert.equal(r.card('ant').zone, 'ground');
          assert.equal(r.state.result, null);
        },
      },
      {
        label: 'Losing comparison',
        reason:
          'Sacrificing Ant draws a card and creates a Credit, but hands over the lethal attack.',
        steps: [...sacrifice('ant'), p2(attack('squadron', 'base'))],
        check: r => assert.equal(r.state.result?.winner, 'p2'),
      },
    ],
  },
  {
    id: 'late-game-body',
    title: 'Keep the unit that can win now',
    skill: 'Stop converting useful bodies into Credits',
    opponent: 'Vader',
    question:
      'You have nine resources, an empty hand and a ready 4-power Commando. The opponent has 4 base HP. Attack or sacrifice?',
    assumptions:
      'No enemy Sentinel blocks the attack. This is a forced immediate win, not a general ban on late-game sacrifices.',
    input: position('late-game-body', {
      round: 8,
      resources: 9,
      enemyHp: 4,
      ground: [card('commando')],
    }),
    lines: [
      {
        label: 'Win now',
        reason: 'Attack the base for four.',
        steps: [attack('commando', 'enemy-base')],
        check: r => assert.equal(r.state.result?.winner, 'p1'),
      },
      {
        label: 'Wasteful comparison',
        reason: 'Sacrifice loses the available lethal body and adds an unneeded Credit.',
        steps: [...sacrifice('commando')],
        check: r => {
          assert.equal(r.state.result, null);
          assert.equal(r.card('commando').zone, 'discard');
          assert.equal(r.credits(), 1);
        },
      },
    ],
  },
  {
    id: 'koska-payoff',
    title: 'A late sacrifice still enables Koska',
    skill: 'Recognize benefits beyond resource acceleration',
    opponent: 'Greef',
    question:
      'At eight resources, is sacrificing an exhausted Door Technician before playing Koska useful?',
    assumptions:
      'Your base has 12 HP and the opponent has already exhausted its ground attacker. You can afford the extra action. No friendly unit has died this phase yet.',
    input: position('koska-payoff', {
      round: 7,
      resources: 8,
      hp: 12,
      hand: [card('koska')],
      ground: [card('door', true)],
      opponent: 'greef',
      enemyGround: [card('nemik', true)],
    }),
    lines: [
      {
        label: 'Synergy line',
        reason:
          'Door heals two; the friendly defeat enables Koska to create a Mandalorian, which gives her Sentinel. The Credit is an additional benefit.',
        steps: [...sacrifice('door'), wait, play('koska'), pay()],
        check: r => {
          assert.equal(r.credits(), 1);
          assert.equal(r.damage(), 16);
          assert(
            Object.values(r.state.cards).some(
              c => c.controller === 'p1' && c.zone === 'ground' && c.cardId === 'mandalorian',
            ),
          );
          assert(effectiveAbilities(r.state, r.card('koska')).keywords?.includes('Sentinel'));
        },
      },
      {
        label: 'No setup comparison',
        reason: 'Koska alone creates no token and has no Sentinel in this position.',
        steps: [play('koska')],
        check: r =>
          assert(!effectiveAbilities(r.state, r.card('koska')).keywords?.includes('Sentinel')),
      },
    ],
  },
  {
    id: 'arvel-credit',
    title: 'Spend the Credit before Arvel can destroy it',
    skill: 'Use visible disruption to choose payment',
    opponent: 'Greef + sideboard Arvel',
    question:
      'A ready Arvel faces your 5-HP base. While playing Mercenary, should you preserve your Credit or spend it?',
    assumptions:
      'This is an explicit sideboard stress variant: one Zeb Orrelios is replaced with Arvel. Arvel can destroy either player’s Credit on attack and deal one extra damage.',
    input: position('arvel-credit', {
      resources: 4,
      credits: 1,
      hp: 5,
      hand: [card('merc')],
      opponent: 'greef',
      extraEnemy: C.arvel,
      enemyGround: [card('arvel')],
    }),
    lines: [
      {
        label: 'Survive',
        reason:
          'Spend the Credit on Mercenary despite having enough ordinary resources. Arvel then deals four instead of five; one resource remains ready.',
        steps: [play('merc'), pay(['credit1']), p2(attack('arvel', 'base'))],
        check: r => {
          assert.equal(r.state.result, null);
          assert.equal(r.ready(), 1);
          assert.equal(r.credits(), 0);
        },
      },
      {
        label: 'Losing comparison',
        reason:
          'Keeping the Credit lets Arvel destroy it, ping your base, and finish with combat damage.',
        steps: [
          play('merc'),
          pay(),
          p2(attack('arvel', 'base')),
          p2(target('credit1')),
          p2(target('base')),
        ],
        check: r => assert.equal(r.state.result?.winner, 'p2'),
      },
    ],
  },
  {
    id: 'galen-credit',
    title: 'Credit tokens can be present but unusable',
    skill: 'Respond to public ability suppression',
    opponent: 'Greef + explicit Galen stress variant',
    question:
      'Galen names Credit. With three resources and a visible Credit, can you play Mercenary? Can your experienced Commando reopen that line?',
    assumptions:
      'Galen, You’ll Never Win replaces one Zeb in this stress variant and is played normally for six including the missing Vigilance aspect. Its naming effect is the same when played with Plot. Your ready Commando has an Experience token (5 power). The ordinary Vader list contains a different Galen.',
    input: position('galen-credit', {
      resources: 3,
      credits: 1,
      hand: [card('merc')],
      ground: [card('commando')],
      attachments: [{ card: 'experience', unit: 'commando' }],
      opponent: 'greef',
      extraEnemy: C.galen,
      enemyHand: [card('galen')],
      enemyResources: 6,
      active: 'p2',
    }),
    setup: [
      p2(play('galen')),
      { ...p2(step('trigger')), ability: 'name-card', label: 'Resolve Galen naming first' },
      { ...p2(accept), name: 'credit', label: 'Galen names Credit' },
      p2(step('decline-effect')),
    ],
    lines: [
      {
        label: 'Recognize the constraint',
        reason:
          'Mercenary is unavailable: the Credit is still public, but it cannot contribute to payment. This branch checks recognition, not an action demonstration.',
        steps: [],
        check: r => {
          assert.equal(r.credits(), 1);
          assert.equal(spendableCredits(r.state, 'p1').length, 0);
          assert(!r.available(play('merc')));
        },
      },
      {
        label: 'Remove the suppression',
        reason:
          'Commando kills Galen; after the scripted opponent pass, the Credit works again and pays the Mercenary shortfall.',
        steps: [attack('commando', 'galen'), wait, play('merc'), pay(['credit1'])],
        check: r => {
          assert.equal(r.card('galen').zone, 'discard');
          assert.equal(r.card('commando').zone, 'ground');
          assert.equal(r.card('merc').zone, 'ground');
          assert.equal(r.credits(), 0);
        },
      },
    ],
  },
  {
    id: 'credits-not-resources',
    title: 'Credits pay for cards, not leader deployment',
    skill: 'Distinguish money from the resource threshold',
    opponent: 'Vader',
    question: 'With six resources and two Credits, can you deploy Krennic? Can you play Chimaera?',
    assumptions:
      'Krennic requires seven real resources. The deploy action may be offered as a no-effect action by the current engine; it does not deploy the leader below threshold.',
    input: position('credits-not-resources', { resources: 6, credits: 2, hand: [card('chim')] }),
    lines: [
      {
        label: 'Pay for a stabilizer',
        reason: 'Play Chimaera with six resources plus one Credit.',
        steps: [play('chim'), pay(['credit1'])],
        check: r => {
          assert.equal(r.card('chim').zone, 'space');
          assert.equal(r.count(), 6);
          assert.equal(r.credits(), 1);
        },
      },
      {
        label: 'Threshold comparison',
        reason: 'Invoking deployment below seven real resources leaves Krennic in the base zone.',
        steps: [ability('leader', 'deploy')],
        check: r => {
          assert.equal(r.card('leader').deployedAs, null);
          assert.equal(r.count(), 6);
          assert.equal(r.credits(), 2);
        },
      },
    ],
  },
  {
    id: 'chimaera-targets',
    title: 'Stabilize with Chimaera and the cheap sacrifice',
    skill: 'Choose both sides of a sacrifice trade',
    opponent: 'Vader',
    question:
      'After playing Chimaera, which friendly unit should you sacrifice to remove the opposing Squadron?',
    assumptions:
      'Seven ready resources; exhausted Door Technician already in play; own base at 12 HP. Chimaera may sacrifice itself, but that gives up the stabilizing ship.',
    input: position('chimaera-targets', {
      resources: 7,
      hp: 12,
      hand: [card('chim')],
      ground: [card('door', true)],
      enemySpace: [card('squadron')],
    }),
    lines: [
      {
        label: 'Reference line',
        reason:
          'Sacrifice Door Technician and remove Squadron, retaining the 6/6 Chimaera and resolving both healing triggers.',
        steps: [
          play('chim'),
          target('door'),
          target('squadron'),
          {
            ...step('trigger'),
            ability: 'when-defeated',
            label: 'Resolve Door Technician healing',
          },
        ],
        check: r => {
          assert.equal(r.card('chim').zone, 'space');
          assert.equal(r.card('door').zone, 'discard');
          assert.equal(r.card('squadron').zone, 'discard');
          assert.equal(r.damage(), 14);
        },
      },
    ],
  },
];
