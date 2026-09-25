import { writeFile } from 'node:fs/promises';
import { cardDefinition } from '../../cards/registry.ts';
import { unitStats } from '../../engine/attachments.ts';
import { effectiveAbilities } from '../../engine/effective-abilities.ts';
import type { GameState } from '../../engine/model.ts';
import { krennicExercises } from './krennic.ts';
import { PracticeRun, runLine, type Step } from './runner.ts';

const name = (id: string) => cardDefinition(id).name;
function health(state: GameState, player: string) {
  const card = state.cards[state.players[player]!.base]!,
    definition = cardDefinition(card.cardId);
  return definition.kind === 'base' ? definition.hp - card.damage : 0;
}
function zone(run: PracticeRun, player: string, zone: string) {
  return (
    Object.values(run.state.cards)
      .filter(c => c.controller === player && c.zone === zone && !c.attachedTo)
      .map(c => {
        const definition = cardDefinition(c.cardId);
        let suffix = '';
        if (zone === 'ground' || zone === 'space') {
          const stats = unitStats(run.state, c),
            abilities = effectiveAbilities(run.state, c);
          const attachments = Object.values(run.state.cards)
            .filter(a => a.attachedTo?.instanceId === c.instanceId)
            .map(a => name(a.cardId));
          suffix = ` (${stats.power}/${stats.hp - c.damage} remaining HP; ${c.exhausted ? 'exhausted' : 'ready'}${abilities.keywords?.includes('Sentinel') ? '; Sentinel' : ''}${attachments.length ? '; ' + attachments.join(', ') : ''})`;
        } else if (definition.kind === 'player-token') suffix = ' (token)';
        return `${name(c.cardId)}${suffix}`;
      })
      .join('; ') || 'empty'
  );
}
function describe(action: Step | { nextRound: true }, run: PracticeRun): string {
  if ('nextRound' in action) return 'Both players pass; regroup, draw and resource one card each';
  const refName = (alias: string | undefined) => (alias ? name(run.card(alias).cardId) : '');
  const actor = action.actor === 'p2' ? 'Opponent: ' : '';
  if (action.kind === 'play') return actor + 'Play ' + refName(action.source);
  if (action.kind === 'attack')
    return actor + refName(action.source) + ' attacks ' + refName(action.target);
  if (action.kind === 'use-ability')
    return action.ability === 'create-credit'
      ? 'Krennic sacrifices ' + refName(action.target) + ' for a Credit'
      : 'Use Krennic’s deploy action';
  if (action.kind === 'target') return actor + 'Choose ' + refName(action.source);
  if (action.kind === 'pass') return 'Opponent passes';
  if (action.selections)
    return action.selections === 'credits'
      ? 'Spend the available Credits on this payment'
      : action.selections.length
        ? `Spend ${action.selections.length} Credit`
        : 'Pay with ordinary resources; keep Credits';
  if (action.name) return actor + 'Name ' + name(action.name);
  return actor + action.label;
}
export function practiceReport() {
  const lines = [
    '# Krennic practice scenarios — review draft',
    '',
    `These are ${krennicExercises.length} synthetic positions using your registered Krennic list. There are ${krennicExercises.reduce((n, e) => n + e.lines.length, 0)} executable lines, including losing comparisons. They are prepared examples for your strategic review; no model has been trained on them and there are no fixed action-score multipliers.`,
    '',
    'Every scripted decision runs through the real engine, the player-only projection and the current AI action adapter. Learner feature vectors are checked for finite values. Each command is checked after checkpoint restoration, and the entire line is replayed from its starting checkpoint. This verifies mechanics and representability, not global strategic optimality or playing strength.',
    '',
    'The opponent’s hand and deck order are never inputs to the learner. Scenarios deliberately control draws and opponent replies. Full lists are partitioned into zones; the Arvel and Galen stress variants each replace one Zeb Orrelios in the Greef list. They do not edit the actual training roster. Galen naming is tested through ordinary play; Plot deployment is not yet a separate exercise.',
    '',
    'Run without starting training: `taskset -c 0-8 bun play/ai/practice/report.ts`.',
    'Regenerate this review: append `--write`. Validate: `taskset -c 0-8 bun test play/testing/ai/krennic-practice.test.ts`.',
    '',
    'Source: [scenario definitions](../../play/ai/practice/krennic.ts), [runner](../../play/ai/practice/runner.ts). Continuous training remains stopped.',
    '',
  ];
  const initial = new PracticeRun(krennicExercises[0]!.input);
  lines.push(
    `Verified target: engine ${initial.state.versions.engine}, state ${initial.state.versions.state}, rules ${initial.state.versions.rules}, cards \`${initial.state.versions.cards}\`.`,
    '',
  );
  let totalCommands = 0,
    totalChoices = 0;
  for (const [index, exercise] of krennicExercises.entries()) {
    const start = new PracticeRun(exercise.input);
    for (const action of exercise.setup ?? []) start.step(action);
    lines.push(
      `## ${index + 1}. ${exercise.title}`,
      '',
      `**Question:** ${exercise.question}`,
      '',
      `**Position:** Round ${start.state.round}; your base ${health(start.state, 'p1')} HP, opponent ${health(start.state, 'p2')} HP. You have ${start.count()} real resources (${start.ready()} ready) and ${start.credits()} Credit(s). Krennic leader is ${start.card('leader').exhausted ? 'exhausted' : 'ready'}. ${start.state.execution.decision?.playerId === 'p1' ? 'Your action.' : 'Opponent action.'} Matchup: ${exercise.opponent}.`,
      '',
      `- Your hand: ${zone(start, 'p1', 'hand')}.`,
      `- Your ground: ${zone(start, 'p1', 'ground')}.`,
      `- Your space: ${zone(start, 'p1', 'space')}.`,
      `- Enemy ground: ${zone(start, 'p2', 'ground')}.`,
      `- Enemy space: ${zone(start, 'p2', 'space')}.`,
      '',
      `**Assumptions:** ${exercise.assumptions}`,
      '',
      `**Practice objective:** ${exercise.skill}.`,
      '',
    );
    for (const line of exercise.lines) {
      const result = runLine(exercise, line);
      totalCommands += result.inputs.length;
      totalChoices += result.microchoices;
      lines.push(
        `### ${line.label}`,
        '',
        line.reason,
        '',
        ...(line.steps.length
          ? line.steps.map((s, i) => `${i + 1}. ${describe(s, result)}`)
          : ['No action is submitted: inspect which plays are available.']),
        '',
        `**Verified result:** ${result.state.result ? (result.state.result.winner === 'p1' ? 'Krennic wins.' : 'Opponent wins.') : 'Game continues.'} Your base ${health(result.state, 'p1')} HP; ${result.count()} real resources (${result.ready()} ready), ${result.credits()} Credit(s). ${result.inputs.length} engine decisions replayed; ${result.microchoices} learner adapter choices checked.`,
        '',
      );
      if (exercise.id === 'opening') {
        lines.push(
          'The resource ledger below is after each non-pass decision. Mercenary’s optional resource effect and Carrier’s ramp effect are accepted explicitly.',
          '',
          '| Round | Decision | Real resources | Ready | Credits |',
          '| --- | --- | ---: | ---: | ---: |',
          ...result.trace
            .filter(t => t.label !== 'pass')
            .map(
              t =>
                `| ${t.round} | ${t.actor}: ${t.label} | ${t.resources} | ${t.ready} | ${t.credits} |`,
            ),
          '',
        );
      }
    }
  }
  lines.push(
    `Validated total: ${totalCommands} engine decisions and ${totalChoices} learner adapter choices across ${krennicExercises.length} positions.`,
    '',
    'Before using these as a curriculum, review the strategic preferences, then add variations for base HP, initiative, missing cards, damage and opposing responses. Keep separate scenario families for evaluation; changing only a random seed is not an independent strategic test. Losing comparison lines must never become expert labels. No optimizer or training-data import is wired to this report.',
    '',
  );
  return lines.join('\n');
}
if (import.meta.main) {
  const report = practiceReport();
  if (process.argv.slice(2).length && process.argv.slice(2).join(' ') !== '--write')
    throw new Error('Usage: bun play/ai/practice/report.ts [--write]');
  if (process.argv.includes('--write')) {
    await writeFile(
      new URL('../../../docs/crossfire/ai-krennic-practice.md', import.meta.url),
      report,
    );
    console.log('Wrote docs/crossfire/ai-krennic-practice.md; training was not started.');
  } else console.log(report);
}
