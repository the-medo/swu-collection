import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { z } from 'zod';
import type { GameView, VisibleDecision } from '../../../../../play/view/types.ts';
import type { CrossfireDeckIssue } from '../../../../../shared/types/crossfire.ts';

export function linkedId(value: string, path: 'decks' | 'crossfire'): string | undefined {
  const raw = value.trim();
  if (z.uuid().safeParse(raw).success) return raw;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return;
    const match = url.pathname.match(new RegExp(`^/${path}/([\\w-]+)/?$`));
    if (match && z.uuid().safeParse(match[1]).success) return match[1];
  } catch {
    /* Incomplete typed input is not a link. */
  }
}
/** Paste only a SWUBASE link (or an ID); never request a pasted remote URL. */
export function deckIdFromSearch(value: string, origin: string): string | undefined {
  const id = linkedId(value, 'decks');
  if (!id) return;
  if (z.uuid().safeParse(value.trim()).success) return id;
  const url = new URL(value.trim());
  if (url.origin === origin || ['swubase.com', 'www.swubase.com'].includes(url.hostname)) return id;
}

export const words = (value: string) =>
  value.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
export const playerName = (id: string | null, seat?: string) =>
  id === seat ? 'You' : id === 'p1' ? 'Player 1' : id === 'p2' ? 'Player 2' : 'No player';
export function crossfireError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    'crossfire-unavailable': 'Crossfire is not enabled on this server yet.',
    unauthenticated: 'Sign in again to continue.',
    'deck-unavailable': 'This deck is unavailable. Choose your own deck or a shared deck.',
    'unsupported-deck': 'This deck is not supported yet. Check it again for details.',
    unavailable: 'This invitation is no longer available.',
    conflict: 'This invitation changed. Refresh to see its current state.',
    incompatible: 'This game belongs to an earlier development engine. Create a new game.',
    'policy-mismatch': 'The visibility settings changed. Read them again before joining.',
    'rate-limited': 'Too many requests. Wait a minute before trying again.',
  };
  return messages[message] ?? 'Crossfire could not complete this request. Please try again.';
}
export function issueLabel(issue: CrossfireDeckIssue) {
  const labels: Record<CrossfireDeckIssue['code'], string> = {
    'unsupported-card': 'Not implemented yet',
    'unknown-card': 'Unknown official card',
    'wrong-role': 'Card cannot be used in this position',
    'missing-card': 'Missing card',
    'unsupported-format': 'This format is not supported yet',
    'leader-count': 'Choose exactly one leader',
    'deck-size': 'Practice decks need at least 6 cards, adjusted by your base, and at most 120',
    'invalid-input': 'Deck contents could not be read',
  };
  return labels[issue.code];
}
export function optionLabel(
  option: VisibleDecision['options'][number],
  view: GameView,
  seat?: string,
) {
  const name = (id: string | undefined) => {
    const cards = [
      ...view.cards,
      ...(view.decision?.inspectedCards ?? []).filter(
        c => !view.cards.some(visible => visible.id === c.id),
      ),
    ];
    const card = cards.find(c => c.id === id);
    const copies = cards.filter(c => c.face?.cardId === card?.face?.cardId);
    return card?.face
      ? `${card.face.name}${copies.length > 1 ? ` · ${copies.findIndex(c => c.id === id) + 1}` : ''}`
      : 'card';
  };
  switch (option.kind) {
    case 'choose-player':
      return `Choose ${playerName(option.playerId, seat)}`;
    case 'initiative':
      return `${playerName(option.playerId, seat)} start with initiative`;
    case 'mulligan':
      return option.takeMulligan ? 'Mulligan hand' : 'Keep hand';
    case 'resource':
      return 'Confirm resources';
    case 'cancel-resource':
      return 'Change resources';
    case 'search':
      return 'Confirm search';
    case 'play': {
      const exploit = option.exploit
        ? ` · Exploit up to ${option.exploit.maxUnits} (${option.exploit.costBeforeExploit} resources before Exploit)`
        : '';
      if (option.smuggle)
        return `Smuggle ${name(option.cards[0])} for ${option.smuggle.cost} resources${option.cards[1] ? ` on ${name(option.cards[1])}` : ''}${option.smuggle.grantedBy ? ` via ${option.smuggle.grantedBy.name}` : ''}${exploit}`;
      return `Play ${name(option.cards[0])}${option.piloting ? ' as a pilot' : ''}${option.cards[1] ? ` on ${name(option.cards[1])}` : ''}${exploit}`;
    }
    case 'attack':
      return `${name(option.cards[0])} → attack ${name(option.cards[1])}`;
    case 'use-ability':
      return `${name(option.cards[0])}: ${words(option.action?.id ?? 'ability')}${typeof option.action?.limit === 'object' && option.action.limit ? ` (${option.action.limit.max} uses per game)` : option.action?.limit === 'once-per-round' ? ' (once per round)' : option.action?.limit ? ' (once per game)' : ''}${option.action?.grantedBy ? ` · ${option.action.grantedBy.name}` : ''}${option.cards[1] ? ` · defeat ${name(option.cards[1])}` : ''}`;
    case 'take-initiative':
      return 'Take initiative';
    case 'pass':
      return 'Pass';
    case 'trigger-player':
    case 'delayed-player':
      return `Resolve ${playerName(option.playerId, seat)}'s abilities`;
    case 'trigger':
      return `Resolve ${option.ability?.source.name ?? 'ability'}${option.ability?.grantedBy ? ` from ${option.ability.grantedBy.name}` : ''}`;
    case 'delayed':
      return `Resolve ${option.delayed?.source.name ?? 'delayed ability'}${option.delayed?.target ? ` on ${option.delayed.target.name}` : ''}`;
    case 'target':
      return view.decision?.effect === 'deploy'
        ? `Deploy as upgrade on ${name(option.cards[0])}`
        : view.decision?.effect === 'attach-pilot'
          ? `Attach ${name(option.cards[0])}`
          : view.decision?.effect === 'detach-pilot'
            ? `Move ${name(option.cards[0])} to ground as an exhausted unit`
            : `Choose ${name(option.cards[0])}`;
    case 'choose-mode':
      return `${words(option.mode ?? 'Choose an effect')}${option.cards[0] ? ` · ${name(option.cards[0])}` : ''}`;
    case 'choose-token':
      return `Create ${words(option.tokenCardId ?? 'token')}`;
    case 'accept-effect':
      return view.decision?.effect === 'replace-upgrade-defeat'
        ? 'Move to ground as an exhausted unit'
        : view.decision?.effect === 'plot'
          ? 'Confirm Plot cards'
          : view.decision?.effect === 'disclose'
            ? 'Reveal cards'
            : 'Use this effect';
    case 'decline-effect':
      return view.decision?.effect === 'free-play-choice'
        ? 'Cancel play'
        : view.decision?.effect === 'replace-upgrade-defeat'
          ? 'Let the upgrade be defeated'
          : 'Skip this effect';
    case 'keep-unique':
      return `Keep ${name(option.cards[0])}`;
    default:
      return words(option.kind);
  }
}
export const decisionTitle: Record<VisibleDecision['kind'], string> = {
  initiative: 'Choose who starts with initiative',
  mulligan: 'Keep your hand or mulligan',
  resource: 'Choose cards to resource',
  action: 'Choose your action',
  'trigger-player': 'Choose whose abilities resolve first',
  trigger: 'Choose an ability to resolve',
  effect: 'Resolve an effect',
  unique: 'Choose which unique copy stays',
  replacement: 'Choose a replacement effect',
  search: 'Search your deck',
  'delayed-player': 'Choose whose delayed abilities resolve first',
  delayed: 'Resolve a delayed ability',
};

export function deckCardName(catalog: CardList | undefined, cardId: string | null | undefined) {
  return cardId ? (catalog?.[cardId]?.name ?? cardId.replace(/--/g, ', ').replace(/-/g, ' ')) : '';
}
