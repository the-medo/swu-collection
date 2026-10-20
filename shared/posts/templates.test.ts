import { expect, test } from 'bun:test';
import { articleTemplates, createArticleTemplate } from './templates.ts';
import { postDocumentSchemas, postPlainText, type PostBlock } from './content.ts';
import type { TournamentReport } from '../types/TournamentReport.ts';

const report: TournamentReport = {
  tournament: {
    id: crypto.randomUUID(),
    name: 'Planetary Qualifier',
    date: '2026-10-10',
    format: 'Premier',
    attendance: 64,
    placement: 12,
    record: '4-2-0',
    completed: true,
  },
  deck: {
    id: crypto.randomUUID(),
    name: 'Sabine',
    leaderId: 'sabine-wren--galvanized-revolutionary',
    baseId: 'energy-conversion-lab',
    hasDecklist: true,
  },
  rounds: [
    {
      round: 1,
      opponentName: 'Leia',
      opponentDeck: {
        id: crypto.randomUUID(),
        name: 'Tarkin',
        leaderId: 'grand-moff-tarkin--oversector-governor',
        baseId: null,
        hasDecklist: false,
      },
      outcome: 'win',
      games: { wins: 2, losses: 1, draws: 0 },
      record: { wins: 1, losses: 0, draws: 0 },
    },
  ],
  hasMetaDecks: true,
};
const flatten = (blocks: PostBlock[]): PostBlock[] =>
  blocks.flatMap(block => [block, ...flatten(block.children)]);
test('all templates are valid persisted editor documents with unique block IDs', () => {
  for (const template of articleTemplates) {
    const body = createArticleTemplate(template.id);
    expect(postDocumentSchemas.rich.safeParse(body).success).toBe(true);
    const blocks = flatten(body.blocks);
    expect(new Set(blocks.map(block => block.id)).size).toBe(blocks.length);
  }
});
test('prefills an event, its real decklist and an editable matchup for each round', () => {
  const body = createArticleTemplate('tournament-report', report);
  const embeds = flatten(body.blocks)
    .filter(block => block.type === 'swuBlock')
    .map(block => JSON.parse(block.props.data));
  expect(postPlainText(body)).toContain('Pre-tournament & preparation');
  expect(postPlainText(body)).toContain(
    'Planetary Qualifier · 2026-10-10 · Premier · 64 players · Finished #12 · Record: 4-2-0',
  );
  expect(embeds[0]).toEqual({ kind: 'decklist', deck: { deckId: report.deck!.id } });
  expect(embeds[1]).toMatchObject({
    kind: 'matchup',
    title: 'Round 1',
    subtitle: 'vs. Leia',
    leftLeader: report.deck!.leaderId,
    leftBase: report.deck!.baseId,
    rightLeader: report.rounds[0]!.opponentDeck!.leaderId,
    footer: 'Win · Games 2–1–0 · Overall 1–0–0',
  });
  expect(postDocumentSchemas.comments.safeParse(embeds[1].notes).success).toBe(true);
  expect(embeds[1].rightBase).toBeUndefined();
  expect(embeds[2]).toEqual({
    kind: 'meta-analysis',
    scope: 'tournament',
    id: report.tournament.id,
    settings: { metaPart: 'all', metaInfo: 'leadersAndBase' },
  });
  const toggles = body.blocks.filter(block => block.type === 'heading' && block.props.isToggleable);
  expect(
    toggles.map(block => postPlainText({ version: 1, blocks: [{ ...block, children: [] }] })),
  ).toEqual(['Decklist', 'Rounds', 'Meta']);
  expect(toggles.map(block => block.children.length)).toEqual([1, 1, 1]);
  expect(toggles.map(block => block.props)).toEqual(
    Array.from({ length: 3 }, () => ({ level: 2, isToggleable: true, defaultOpen: true })),
  );
});
test('does not embed an empty deck and retains useful prompts when details are unavailable', () => {
  const body = createArticleTemplate('tournament-report', {
    ...report,
    deck: { ...report.deck!, hasDecklist: false },
    rounds: [],
    hasMetaDecks: false,
  });
  expect(flatten(body.blocks).some(block => block.type === 'swuBlock')).toBe(false);
  expect(postPlainText(body)).toContain('Deck choice');
  expect(postPlainText(body)).toContain('Add a matchup for each round');
  const bye = createArticleTemplate('tournament-report', {
    ...report,
    deck: null,
    rounds: [
      { ...report.rounds[0]!, outcome: 'bye', games: null, opponentName: null, opponentDeck: null },
    ],
  });
  const widget = flatten(bye.blocks).find(block => block.type === 'swuBlock')!;
  if (widget.type !== 'swuBlock') throw new Error('Expected a matchup');
  expect(JSON.parse(widget.props.data)).toMatchObject({
    subtitle: 'Bye',
    footer: 'Bye · Overall 1–0–0',
  });
});
test('rounds are adjacent children of their toggle, with no empty paragraph spacers', () => {
  const body = createArticleTemplate('tournament-report', {
    ...report,
    rounds: [report.rounds[0]!, { ...report.rounds[0]!, round: 2 }],
  });
  const rounds = body.blocks.find(block => block.children.length === 2)!;
  expect(rounds.children.map(block => block.type)).toEqual(['swuBlock', 'swuBlock']);
  expect(postDocumentSchemas.rich.safeParse(body).success).toBe(true);
});

test('limited reports include opponent and score matchups without decklist or meta embeds', () => {
  const body = createArticleTemplate('tournament-report', {
    ...report,
    tournament: { ...report.tournament, format: 'Sealed play' },
    deck: null,
    rounds: [{ ...report.rounds[0]!, opponentDeck: null }],
    hasMetaDecks: false,
  });
  const embeds = flatten(body.blocks)
    .filter(block => block.type === 'swuBlock')
    .map(block => JSON.parse(block.props.data));
  expect(embeds).toHaveLength(1);
  expect(embeds[0]).toMatchObject({
    kind: 'matchup',
    title: 'Round 1',
    subtitle: 'vs. Leia',
    footer: 'Win · Games 2–1–0 · Overall 1–0–0',
  });
  for (const field of ['leftLeader', 'leftBase', 'rightLeader', 'rightBase'])
    expect(embeds[0][field]).toBeUndefined();
});
