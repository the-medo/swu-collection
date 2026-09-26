import { writeFile } from 'node:fs/promises';
import { cardDefinition } from '../../cards/registry.ts';
import { unitStats } from '../../engine/attachments.ts';
import { rotationCases, rotationEnvironment, rotationManifest } from './rotation-curriculum.ts';
import { practiceRoster } from './positions.ts';
import { PracticeRun, runLine, type Step } from './runner.ts';

const cardName = (id: string) => cardDefinition(id).name;
function board(run: PracticeRun, player: string, zone: string) {
  return (
    Object.values(run.state.cards)
      .filter(c => c.controller === player && c.zone === zone && !c.attachedTo)
      .map(c => {
        const combat = ['ground', 'space'].includes(zone);
        const stats = combat ? unitStats(run.state, c) : null;
        return `${cardName(c.cardId)}${stats ? ` (${stats.power} power, ${stats.hp - c.damage} HP; ${c.exhausted ? 'exhausted' : 'ready'})` : ''}`;
      })
      .join('; ') || 'empty'
  );
}
function describe(action: Step | { nextRound: true }, run: PracticeRun) {
  if ('nextRound' in action)
    return 'Regroup: both players pass, draw, and resource an unlabelled card.';
  const name = (alias: string) => cardName(run.card(alias).cardId);
  const prefix = action.actor === 'p2' ? 'Opponent: ' : '';
  if (action.name) return prefix + `Name ${cardName(action.name)}.`;
  if (action.kind === 'play')
    return (
      prefix + `Play ${name(action.source!)}${action.target ? ` on ${name(action.target)}` : ''}.`
    );
  if (action.kind === 'attack')
    return prefix + `${name(action.source!)} attacks ${name(action.target!)}.`;
  if (action.kind === 'use-ability')
    return (
      prefix +
      `Use ${name(action.source!)}: ${action.ability}${action.target ? `; sacrifice ${name(action.target)}` : ''}.`
    );
  if (action.kind === 'target') return prefix + `Choose ${name(action.source!)}.`;
  if (action.selections === 'credits') return prefix + 'Accept and spend the available Credits.';
  if (action.selections?.length)
    return prefix + `${action.kind}: select ${action.selections.map(name).join(', ')}.`;
  if (action.kind === 'trigger')
    return (
      prefix +
      `Resolve trigger ${action.ability ?? 'first eligible'}${action.teach === false ? ' (scripted, not a teaching label)' : ''}.`
    );
  return prefix + action.label + '.';
}
export function rotationReport() {
  const lines = [
    '# Eight-deck practice curriculum',
    '',
    '96 scenario families: 12 per exact saved deck. Ten families per deck enter practice; two entire families stay held out. Each family has four variations. Variations of the same family are not independent evidence of strategic generalization.',
    '',
    'Every reference is executed through the real engine, player-only projection, and action adapter. Commands and deterministic random continuations are checked after checkpoint restoration and replayed. Outcome checks establish legality and the stated tactical result; they do not prove global strategic optimality. Scripted opponent choices are never learner labels. Hidden hands and deck orders never enter model features.',
    '',
    'The original twelve Krennic families are retained, including their explicitly identified Arvel/Galen stress substitutions. The seven other sets partition the exact eight-deck mainboards. Named Plot resources are deliberate. There are no fixed strategic score multipliers.',
    '',
    `Curriculum: \`${rotationManifest.version}\`; content hash \`${rotationManifest.hash}\`.`,
    '',
    'Regenerate: `taskset -c 0-8 bun play/ai/practice/rotation-report.ts --write`.',
    '',
    'Training and interpretation: [eight-deck rotation](ai-eight-deck-training.md).',
    '',
  ];
  let commands = 0;
  for (const deck of practiceRoster.decks) {
    lines.push(`## ${deck.label}`, '', `Archetypes: ${deck.strategies.join(', ')}.`, '');
    const seen = new Set<string>();
    for (const item of rotationCases.filter(c => c.deck === deck.key)) {
      if (seen.has(item.family)) continue;
      seen.add(item.family);
      const before = new PracticeRun(item.exercise.input);
      for (const action of item.exercise.setup ?? []) before.step(action);
      const after = runLine(item.exercise, item.line, {
        encoding: rotationEnvironment.encoding,
        deckIndex: practiceRoster.decks.findIndex(d => d.key === deck.key),
      });
      commands += after.inputs.length;
      lines.push(
        `### ${seen.size}. ${item.title}${item.split === 'heldout' ? ' — held out' : ''}`,
        '',
        item.line.reason,
        '',
        `**Position:** Round ${before.state.round}; ${before.count()} resources (${before.ready()} ready), ${before.credits()} Credits. Opponent: ${item.exercise.opponent}.`,
        '',
        `- Your hand: ${board(before, 'p1', 'hand')}.`,
        `- Your ground: ${board(before, 'p1', 'ground')}.`,
        `- Your space: ${board(before, 'p1', 'space')}.`,
        `- Enemy ground: ${board(before, 'p2', 'ground')}.`,
        `- Enemy space: ${board(before, 'p2', 'space')}.`,
        '',
        `**Assumptions:** ${item.exercise.assumptions}`,
        '',
        ...item.line.steps.map((s, i) => `${i + 1}. ${describe(s, after)}`),
        '',
        `**Verified:** ${after.state.result ? `Winner: ${after.state.result.winner}.` : 'The stated outcome assertions pass; game continues.'} ${after.count()} resources (${after.ready()} ready), ${after.credits()} Credits; ${after.inputs.length} engine inputs replayed.`,
        '',
      );
    }
  }
  lines.push(
    `All 96 representative lines passed; ${commands} engine inputs replayed. The test suite additionally checks every variation.`,
    '',
  );
  return lines.join('\n');
}
if (import.meta.main) {
  if (process.argv.slice(2).join(' ') !== '--write')
    throw new Error('Usage: bun play/ai/practice/rotation-report.ts --write');
  await writeFile(
    new URL('../../../docs/crossfire/ai-eight-deck-practice.md', import.meta.url),
    rotationReport(),
  );
  console.log('Wrote docs/crossfire/ai-eight-deck-practice.md; no optimizer was run.');
}
