import { postDocumentSchemas, type PostBlock, type PostDocument } from './content.ts';
import { paragraph, heading, widget, toggleSection } from './templateBlocks.ts';
import type {
  TournamentReport,
  TournamentReportRound,
  TournamentReportScore,
} from '../types/TournamentReport.ts';

export const articleTemplates = [
  {
    id: 'deck-guide',
    name: 'Deck guide',
    description: 'Explain your game plan, card choices, mulligans, and matchups.',
  },
  {
    id: 'tournament-report',
    name: 'Tournament report',
    description: 'Tell the story of your event, with decks and rounds from your Melee history.',
  },
  {
    id: 'limited-guide',
    name: 'Limited guide',
    description: 'Explore a set, its archetypes, and the picks that make a great deck.',
  },
  {
    id: 'meta-report',
    name: 'Meta report',
    description: 'Break down the field, winning strategies, and what to watch next.',
  },
] as const;
export type ArticleTemplateId = (typeof articleTemplates)[number]['id'];

export const reportScore = (score: TournamentReportScore) =>
  `${score.wins}–${score.losses}–${score.draws}`;
export function reportRoundResult(round: TournamentReportRound) {
  const label = {
    win: 'Win',
    loss: 'Loss',
    draw: 'Draw',
    bye: 'Bye',
    unknown: 'Result unavailable',
  }[round.outcome];
  return [
    label,
    round.games && `Games ${reportScore(round.games)}`,
    round.record && `Overall ${reportScore(round.record)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function createArticleTemplate(
  id: ArticleTemplateId,
  report?: TournamentReport,
): PostDocument {
  let blocks: PostBlock[];
  if (id !== 'tournament-report') {
    const sections = {
      'deck-guide': [
        'Game plan',
        'The decklist',
        'Mulligans and resourcing',
        'Key card choices',
        'Matchups and sideboarding',
      ],
      'limited-guide': [
        'Format and set',
        'Key cards',
        'Archetypes',
        'Draft picks or pool construction',
        'Gameplay advice',
      ],
      'meta-report': [
        'Events and data sources',
        'The field',
        'Winning strategies',
        'Changes to watch',
      ],
    }[id];
    blocks = sections.flatMap(title => [heading(title), paragraph()]);
  } else {
    const event = report?.tournament;
    const facts = event
      ? [
          event.name,
          event.date,
          event.format,
          `${event.attendance} players`,
          event.completed && event.placement ? `Finished #${event.placement}` : null,
          event.record ? `Record: ${event.record}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : 'Introduce the event, your goals, and what made this tournament memorable.';
    blocks = [
      heading('Intro'),
      paragraph(facts),
      paragraph(),
      heading('Pre-tournament & preparation'),
      paragraph(
        'What did you test, which matchups did you expect, and why did you choose this deck?',
      ),
    ];
    if (report?.deck?.hasDecklist) {
      blocks.push(
        toggleSection('Decklist', [widget({ kind: 'decklist', deck: { deckId: report.deck.id } })]),
      );
    } else {
      blocks.push(
        heading('Deck choice'),
        paragraph(
          'Describe your deck and the choices you made for this event. Add a decklist if you have one.',
        ),
      );
    }
    const rounds: PostBlock[] = [];
    if (report?.rounds.length) {
      for (const round of report.rounds) {
        rounds.push(
          widget({
            kind: 'matchup',
            title: `Round ${round.round}`,
            subtitle:
              round.outcome === 'bye'
                ? 'Bye'
                : round.opponentName
                  ? `vs. ${round.opponentName}`.slice(0, 240)
                  : 'Opponent unavailable',
            leftLeader: report.deck?.leaderId ?? undefined,
            leftBase: report.deck?.baseId ?? undefined,
            rightLeader: round.opponentDeck?.leaderId ?? undefined,
            rightBase: round.opponentDeck?.baseId ?? undefined,
            notes: {
              version: 1,
              blocks: [
                paragraph(
                  round.outcome === 'bye'
                    ? 'Add any notes about the break or preparation for the next round.'
                    : 'Describe the key plays, sideboarding, and what you learned from this round.',
                ),
              ],
            },
            footer: reportRoundResult(round),
          }),
        );
      }
    } else {
      rounds.push(
        paragraph(
          'Add a matchup for each round, with your opponent, the result, and the key moments.',
        ),
      );
    }
    blocks.push(
      toggleSection('Rounds', rounds),
      toggleSection('Meta', [
        report?.hasMetaDecks
          ? widget({
              kind: 'meta-analysis',
              scope: 'tournament',
              id: report.tournament.id,
              settings: { metaPart: 'all', metaInfo: 'leadersAndBase' },
            })
          : paragraph('Add tournament meta analysis when public decklists are available.'),
      ]),
      heading('What I learned'),
      paragraph('What worked, what would you change, and what will you take into your next event?'),
    );
  }
  return postDocumentSchemas.rich.parse({ version: 1, blocks });
}
