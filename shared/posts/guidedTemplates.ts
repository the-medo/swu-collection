import { postDocumentSchemas, type PostBlock } from './content.ts';
import { paragraph, heading, widget, toggleSection } from './templateBlocks.ts';
import type {
  ArticleTemplateSection,
  GuidedArticleTemplate,
  TemplateCard,
  TemplateDeck,
  TemplateMeta,
} from '../types/ArticleTemplates.ts';

function section(
  id: string,
  title: string,
  description: string,
  children: PostBlock[],
  toggle = false,
): ArticleTemplateSection {
  return {
    id,
    title,
    description,
    blocks: toggle ? [toggleSection(title, children)] : [heading(title), ...children],
  };
}
export function templateCardGroups(cards: TemplateCard[]): PostBlock[] {
  const unique = [...new Map(cards.map(card => [card.cardId, card])).values()];
  const blocks: PostBlock[] = [];
  for (let offset = 0; offset < unique.length; offset += 30) {
    blocks.push(
      widget({
        kind: 'card-group',
        cards: unique
          .slice(offset, offset + 30)
          .map(({ cardId, variantId, name }) => ({ cardId, variantId, name })),
        size: 'small',
        text: '',
      }),
    );
  }
  return blocks;
}
function cardNotes(cards: TemplateCard[]): PostBlock[] {
  return cards.map(card => ({
    ...paragraph(),
    content: [
      { type: 'text' as const, text: card.name, styles: { bold: true } },
      { type: 'text' as const, text: ' — ', styles: {} },
    ],
  }));
}
export function finishGuidedTemplate(template: GuidedArticleTemplate, selected: string[]) {
  return {
    title: template.title.slice(0, 200),
    references: template.references,
    body: postDocumentSchemas.rich.parse({
      version: 1,
      blocks: template.sections
        .filter(item => selected.includes(item.id))
        .flatMap(item => item.blocks),
    }),
  };
}
export function createDeckGuide(
  deck: TemplateDeck,
  cards: TemplateCard[],
  meta?: TemplateMeta,
): GuidedArticleTemplate {
  const cardMap = new Map(cards.map(card => [card.cardId, card]));
  const board = (number: number) =>
    [
      ...new Set(
        deck.cards
          .filter(card => card.board === number && card.quantity > 0)
          .map(card => card.cardId),
      ),
    ]
      .map(
        id =>
          cardMap.get(id) ?? {
            cardId: id,
            variantId: '',
            name: id,
            type: 'Unknown',
            cost: null,
            rarity: '',
          },
      )
      .sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity) || a.name.localeCompare(b.name));
  const main = board(1),
    sideboard = board(2);
  const unit = (card: TemplateCard) =>
    card.type.toLowerCase().includes('unit') && !card.type.toLowerCase().includes('leader');
  const groups: { id: string; title: string; cards: TemplateCard[] }[] = [
    ...[2, 3, 4].map(cost => ({
      id: `drops-${cost}`,
      title: `${cost} drops`,
      cards: main.filter(card => unit(card) && card.cost === cost),
    })),
    {
      id: 'drops-5',
      title: '5+ drops',
      cards: main.filter(card => unit(card) && card.cost !== null && card.cost >= 5),
    },
    {
      id: 'events-upgrades',
      title: 'Events and upgrades',
      cards: main.filter(card => ['event', 'upgrade'].includes(card.type.toLowerCase())),
    },
  ];
  const grouped = new Set(groups.flatMap(group => group.cards.map(card => card.cardId)));
  const other = main.filter(card => !grouped.has(card.cardId));
  if (other.length) groups.push({ id: 'other-cards', title: 'Other cards', cards: other });
  const sections = [
    section('intro', 'Intro', 'Introduce your deck and who it is for.', [
      paragraph(`Introduce ${deck.name}, its strengths, and when you would choose to play it.`),
    ]),
    section(
      'decklist',
      'Decklist',
      'Your selected deck, embedded and editable.',
      [widget({ kind: 'decklist', deck: { deckId: deck.deckId } })],
      true,
    ),
    section('game-plan', 'Game plan', 'Explain how the deck wins.', [
      paragraph('Describe your opening turns, the leader turn, and how you close the game.'),
    ]),
    ...groups.map(group =>
      section(
        group.id,
        group.title,
        `${group.cards.length} different cards · artwork and a writing block for each.`,
        group.cards.length
          ? [...templateCardGroups(group.cards), ...cardNotes(group.cards)]
          : [paragraph('No cards in this category in the selected main deck.')],
        true,
      ),
    ),
    section('mulligans', 'Mulligans & resourcing', 'Opening hands and resource decisions.', [
      paragraph('What makes a keep? Which cards do you resource early, and which do you save?'),
    ]),
  ];
  // The matchup widget currently has one leader slot per side.
  const twoLeaders = deck.leaderIds.length > 1;
  const matchups = twoLeaders ? [] : (meta?.archetypes.slice(0, 5) ?? []);
  sections.push(
    section(
      'matchups',
      'Matchups',
      matchups.length
        ? `${matchups.length} most represented leader/base combinations in the current meta.`
        : 'Space to write your own matchup and sideboard plans.',
      [
        paragraph(
          twoLeaders
            ? 'Add matchups for your two-leader deck here. Automatic matchups currently support one leader per deck.'
            : matchups.length && meta?.deckCount
              ? `${meta.source.name} · PQ and higher · ${meta.deckCount} public tournament decks · As of ${meta.asOf}. Matchups are ordered by representation.`
              : 'Current meta data is unavailable for this format. Add your matchups here.',
        ),
        ...matchups.map(opponent =>
          widget({
            kind: 'matchup',
            title: `vs. ${cardMap.get(opponent.leaderId)?.name ?? opponent.leaderId}`.slice(0, 120),
            subtitle: cardMap.get(opponent.baseId)?.name ?? opponent.baseId,
            leftLeader: deck.leaderIds[0],
            leftBase: deck.baseId ?? undefined,
            rightLeader: opponent.leaderId,
            rightBase: opponent.baseId,
            notes: {
              version: 1,
              blocks: [
                paragraph('Describe your game plan, key threats, and mulligan priorities.'),
                paragraph('Sideboard plan:'),
                paragraph('IN: '),
                paragraph('OUT: '),
              ],
            },
            footer: `${opponent.count} decks · ${((opponent.count / meta!.deckCount) * 100).toFixed(1)}% of the available field`,
          }),
        ),
      ],
      true,
    ),
  );
  sections.push(
    section(
      'sideboard',
      'Sideboard',
      `${sideboard.length} different sideboard cards.`,
      sideboard.length
        ? [...templateCardGroups(sideboard), ...cardNotes(sideboard)]
        : [
            paragraph(
              'Explain your sideboard options and what you would change for different fields.',
            ),
          ],
      true,
    ),
  );
  sections.push(
    section('takeaways', 'Final thoughts', 'Advice for players picking up the deck.', [
      paragraph('What should a new pilot practice first? What would you change next?'),
    ]),
  );
  return {
    title: `${deck.name} — deck guide`,
    sections,
    references: [
      { type: 'deck', id: deck.deckId, startSeconds: null },
      ...deck.leaderIds.map(id => ({ type: 'leader' as const, id, startSeconds: null })),
      ...(deck.baseId ? [{ type: 'base' as const, id: deck.baseId, startSeconds: null }] : []),
    ],
  };
}
export function createMetaReport(
  meta: TemplateMeta,
  cards: TemplateCard[],
  archetypeKeys: string[],
  deckKeys: string[],
): GuidedArticleTemplate {
  const names = new Map(cards.map(card => [card.cardId, card.name]));
  const selectedDecks = meta.decklists.filter(deck =>
    deckKeys.includes(`${deck.tournamentId}:${deck.id}`),
  );
  const source = meta.source;
  const chart: PostBlock[] =
    source.scope === 'current'
      ? []
      : [
          widget({
            kind: 'meta-analysis',
            scope: source.scope,
            id: source.id,
            settings: { metaPart: 'all', metaInfo: 'leadersAndBase' },
          }),
        ];
  const attendance = meta.events.reduce((sum, event) => sum + event.attendance, 0);
  return {
    title: `${source.name} — meta report`,
    references: [
      ...meta.events
        .slice(0, 40)
        .map(event => ({ type: 'tournament' as const, id: event.id, startSeconds: null })),
      ...[...new Set(selectedDecks.map(deck => deck.id))].slice(0, 5).map(id => ({
        type: 'deck' as const,
        id,
        startSeconds: null,
      })),
    ],
    sections: [
      section(
        'intro',
        'Intro & data sources',
        `${meta.events.length} events · ${meta.deckCount} public tournament decks.`,
        [
          paragraph(
            `${source.name} · As of ${meta.asOf} · ${attendance} event entries · ${meta.deckCount} available public tournament decks. Attendance and deck-data coverage may differ.`,
          ),
          ...meta.events.map(event =>
            paragraph(
              `${event.name} · ${event.date} · ${event.attendance} players${event.imported ? '' : ' · Deck data not imported'}`,
            ),
          ),
          paragraph('Introduce the field and the questions this report explores.'),
        ],
      ),
      section(
        'field',
        'The field',
        'Interactive tournament meta analysis.',
        [...chart, paragraph('What stands out about the distribution of leaders and bases?')],
        true,
      ),
      section(
        'decks',
        'Top-performing decks',
        `${selectedDecks.length} selected decklists with recorded placements.`,
        selectedDecks.length
          ? selectedDecks.flatMap(deck => [
              heading(deck.name || names.get(deck.leaderId ?? '') || 'Tournament deck', 3),
              paragraph(`#${deck.placement} · ${deck.tournamentName}`),
              widget({ kind: 'decklist', deck: { deckId: deck.id } }),
              paragraph('Explain the choices that make this list interesting.'),
            ])
          : [paragraph('Add a representative decklist when one becomes available.')],
        true,
      ),
      section(
        'archetypes',
        'Archetypes to discuss',
        `${archetypeKeys.length} selected leader/base combinations.`,
        meta.archetypes
          .filter(item => archetypeKeys.includes(item.key))
          .flatMap(item => [
            heading(
              `${names.get(item.leaderId) ?? item.leaderId} / ${names.get(item.baseId) ?? item.baseId}`,
              3,
            ),
            ...templateCardGroups(
              cards.filter(card => card.cardId === item.leaderId || card.cardId === item.baseId),
            ),
            paragraph(
              `${item.count} decks · ${((item.count / meta.deckCount) * 100).toFixed(1)}% of the available field. Explain its position and notable matchups.`,
            ),
          ]),
        true,
      ),
      section('takeaways', 'Takeaways & what to watch next', 'Your conclusions and predictions.', [
        paragraph(
          'Which strategies would you prepare for, and what could change at the next event?',
        ),
      ]),
    ],
  };
}
export function createLimitedGuide(input: {
  set: string;
  setName: string;
  format: 'Draft' | 'Sealed';
  cards: TemplateCard[];
  leaderIds: string[];
  keyCardIds: string[];
  exampleDeck?: TemplateDeck;
}): GuidedArticleTemplate {
  const leaders = input.cards.filter(card => input.leaderIds.includes(card.cardId));
  const picks = input.cards.filter(card => input.keyCardIds.includes(card.cardId));
  const commons = picks.filter(card => ['Common', 'Uncommon'].includes(card.rarity));
  const rares = picks.filter(card => !commons.includes(card));
  const deck = input.exampleDeck;
  return {
    title: `${input.setName} — ${input.format.toLowerCase()} guide`,
    references: [
      { type: 'set', id: input.set, startSeconds: null },
      ...leaders.map(card => ({ type: 'leader' as const, id: card.cardId, startSeconds: null })),
      ...(deck ? [{ type: 'deck' as const, id: deck.deckId, startSeconds: null }] : []),
    ],
    sections: [
      section(
        'intro',
        'Set overview',
        `${input.format} · ${input.cards.length} catalog cards available for this set.`,
        [
          paragraph(`${input.setName} · ${input.format}`),
          paragraph(
            'Introduce the pace of the format, its mechanics, and what players should look for.',
          ),
        ],
      ),
      section(
        'leaders',
        'Leaders & archetypes',
        `${leaders.length} selected leaders, with artwork and space for a game plan.`,
        leaders.length
          ? leaders.flatMap(card => [
              heading(card.name, 3),
              ...templateCardGroups([card]),
              paragraph(
                'Describe the supporting aspects, key synergies, and how this leader wins.',
              ),
            ])
          : [paragraph('Add the leaders and aspect combinations you want to cover.')],
        true,
      ),
      section(
        'commons',
        'Commons & uncommons to prioritise',
        `${commons.length} selected cards.`,
        commons.length
          ? [...templateCardGroups(commons), ...cardNotes(commons)]
          : [paragraph('Which commons and uncommons are the foundations of your decks?')],
        true,
      ),
      section(
        'rares',
        'Rares & build-arounds',
        `${rares.length} selected cards.`,
        rares.length
          ? [...templateCardGroups(rares), ...cardNotes(rares)]
          : [paragraph('Which rares change your picks or deck-building decisions?')],
        true,
      ),
      section(
        'building',
        input.format === 'Draft' ? 'Drafting priorities' : 'Building your sealed deck',
        'A structure tailored to your chosen format.',
        [
          paragraph(
            input.format === 'Draft'
              ? 'Explain early picks, reading signals, choosing aspects, and when to change direction.'
              : 'Explain how you evaluate leaders, available removal, the curve, and your strongest aspect combinations.',
          ),
        ],
      ),
      section(
        'examples',
        'Example decks',
        deck ? deck.name : 'Space for an example list.',
        deck
          ? [
              widget({ kind: 'decklist', deck: { deckId: deck.deckId } }),
              paragraph('Explain the build and which cards could be replaced.'),
            ]
          : [paragraph('Add an example deck and explain how its pieces work together.')],
        true,
      ),
      section('gameplay', 'Gameplay advice', 'Combat, resources, and common mistakes.', [
        paragraph(
          'What should players pay attention to during games? Include resource decisions, combat tricks, and common mistakes.',
        ),
      ]),
    ],
  };
}
