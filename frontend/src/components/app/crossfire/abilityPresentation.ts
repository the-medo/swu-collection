import type {
  GameView,
  VisibleDecision,
  VisibleReference,
} from '../../../../../play/view/types.ts';
import { words } from './presentation.ts';
type PrintedCard = {
  name?: string;
  title?: string;
  type?: string;
  text?: string | null;
  deployBox?: string | null;
  epicAction?: string | null;
};
export type AbilityCatalog = Record<string, PrintedCard | undefined>;
const timingNames: Record<string, string> = {
  played: 'When played',
  defeated: 'When defeated',
  attack: 'On attack',
  deployed: 'When deployed',
  'friendly-played': 'When a friendly unit is played',
  'regroup-start': 'Regroup ability',
};
function lines(text: string) {
  return text
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}
export function sourceText(
  source: VisibleReference,
  view: GameView,
  catalog?: AbilityCatalog,
): string {
  const card = catalog?.[source.cardId];
  const side = source.side ?? view.cards.find(c => c.id === source.currentCardId)?.face?.side;
  return (
    side === 'back' && card?.deployBox ? card.deployBox : card?.text || card?.epicAction || ''
  )
    .replace(/<uq>/g, 'unique')
    .replace(/<bullet>/g, '• ')
    .replace(/<\/bullet>/g, '')
    .trim();
}
export function decisionDescription(view: GameView, catalog?: AbilityCatalog): string {
  if (view.decision?.effect === 'plot')
    return 'Choose the resource cards you plan to play using Plot.';
  if (view.decision?.presentation) return view.decision.presentation.text;
  const source = view.decision?.source;
  if (!source) return '';
  return sourceText(source, view, catalog).replace(/^Action[^:]*:\s*/i, '');
}
export function triggerPresentation(
  option: VisibleDecision['options'][number],
  view: GameView,
  catalog?: AbilityCatalog,
) {
  const ability = option.ability;
  const source = ability?.grantedBy ?? ability?.source ?? option.delayed?.source;
  const text = source ? sourceText(source, view, catalog) : '';
  const id = ability?.id ?? '';
  if (id === 'plot' && ability?.timing === 'leader-deployed')
    return { source, title: 'Plot', description: 'You may play this card from your resources.' };
  const keyword = /^(ambush|shielded|support|restore|saboteur)(?:-|$)/.exec(id)?.[1];
  if (keyword) {
    const descriptions: Record<string, string> = {
      ambush: 'You may ready this unit and attack an enemy unit.',
      shielded: 'Give this unit a Shield token.',
      support: 'Attack with another unit, sharing this unit’s other abilities for that attack.',
      restore: 'Heal damage from your base when this unit attacks.',
      saboteur: 'Defeat all Shield tokens on the defender.',
    };
    return { source, title: words(keyword), description: descriptions[keyword]! };
  }
  const timing = ability?.timing ?? '';
  const pattern =
    timing === 'played'
      ? /^When Played\b/i
      : timing === 'defeated'
        ? /^(When Defeated|When Played\/When Defeated)\b/i
        : timing === 'attack'
          ? /^On Attack\b/i
          : timing === 'deployed'
            ? /^When Deployed\b/i
            : timing === 'friendly-played'
              ? /^When you play\b/i
              : null;
  const matching = pattern ? lines(text).filter(line => pattern.test(line)) : [];
  const description = matching[ability?.index ?? 0] ?? matching[0] ?? text;
  const deploy =
    catalog?.[source?.cardId ?? '']?.type === 'Leader' &&
    /deploy (?:this leader|him|her|it)\b/i.test(description);
  return {
    source,
    title: deploy
      ? `Deploy ${catalog?.[source?.cardId ?? '']?.title ?? 'leader'}`
      : (timingNames[timing] ??
        (timing
          ? words(timing)
          : option.kind === 'delayed'
            ? 'Delayed ability'
            : 'Resolve ability')),
    description:
      description.replace(
        /^(?:When Played\/When Defeated|When Played|When Defeated|On Attack|When Deployed):\s*/i,
        '',
      ) || words(id || 'Resolve this effect'),
  };
}
