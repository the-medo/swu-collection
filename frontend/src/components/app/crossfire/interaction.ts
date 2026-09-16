import {
  disclosureComplete,
  type GameView,
  type VisibleDecision,
} from '../../../../../play/view/types.ts';

export type BoardOption = VisibleDecision['options'][number];
export type CardAction = { key: string; option: BoardOption; options: BoardOption[] };
export type BoardInteraction = {
  epoch: string;
  decisionId: string | null;
  source: string | null;
  action: string | null;
  target: string | null;
  selections: string[];
};
export type CardPress =
  | { kind: 'interaction'; interaction: BoardInteraction }
  | { kind: 'submit'; optionId: string; selections: string[] }
  | { kind: 'none' };

export function freshInteraction(view: GameView): BoardInteraction {
  return {
    epoch: view.epoch,
    decisionId: view.decision?.id ?? null,
    source: null,
    action: null,
    target: null,
    selections: [],
  };
}
export function currentInteraction(view: GameView, interaction: BoardInteraction) {
  return interaction.epoch === view.epoch && interaction.decisionId === (view.decision?.id ?? null)
    ? interaction
    : freshInteraction(view);
}
export function sourceOf(option: BoardOption): string | null {
  if (['play', 'attack', 'use-ability'].includes(option.kind)) return option.cards[0] ?? null;
  if (option.kind === 'trigger') return option.ability?.source.currentCardId ?? null;
  if (option.kind === 'delayed') return option.delayed?.source.currentCardId ?? null;
  return null;
}
export function targetOf(option: BoardOption): string | null {
  return ['play', 'attack', 'use-ability'].includes(option.kind) ? (option.cards[1] ?? null) : null;
}
export function directTargetOf(option: BoardOption): string | null {
  return ['target', 'keep-unique'].includes(option.kind) ? (option.cards[0] ?? null) : null;
}

/**
 * Collapse choices between mechanically interchangeable copies of one token on
 * one host into an explicit prompt button. Choices spanning token types or
 * hosts stay on the board because the physical target affects the outcome.
 */
export function inlineTokenChoice(view: GameView) {
  const decision = view.decision;
  if (!decision || decision.effect === 'ability-payment' || decision.effect === 'defeat-tokens')
    return null;
  const selection = decision.selection;
  if (
    selection &&
    (selection.max !== 1 ||
      selection.min > 1 ||
      selection.allocation ||
      selection.budget ||
      selection.disclose)
  )
    return null;
  const options = decision.options.filter(option =>
    selection ? option.kind === 'accept-effect' : directTargetOf(option),
  );
  if (
    !options.length ||
    decision.options.some(option => !options.includes(option) && option.kind !== 'decline-effect')
  )
    return null;
  if (selection && options.length !== 1) return null;
  const cards = (selection?.cards ?? options.map(option => directTargetOf(option)!)).map(id =>
    view.cards.find(card => card.id === id),
  );
  const first = cards[0];
  if (
    !first?.face?.token ||
    first.face.kind !== 'upgrade' ||
    !first.attachedTo ||
    cards.some(
      card =>
        !card?.face?.token ||
        card.face.kind !== 'upgrade' ||
        card.face.cardId !== first.face!.cardId ||
        card.attachedTo !== first.attachedTo,
    )
  )
    return null;
  const host = view.cards.find(card => card.id === first.attachedTo && card.face);
  if (!host) return null;
  return {
    option: options[0]!,
    selections: selection ? [first.id] : [],
    skip:
      selection?.min === 0 && !decision.options.some(o => o.kind === 'decline-effect')
        ? { optionId: options[0]!.id, selections: [] as string[] }
        : null,
    optionIds: new Set(options.map(option => option.id)),
    cardIds: new Set(cards.map(card => card!.id)),
    host,
    token: first,
  };
}
export function cardActions(decision: VisibleDecision | null, cardId: string): CardAction[] {
  const groups = new Map<string, CardAction>();
  for (const option of decision?.options ?? []) {
    if (option.action?.deploymentOnly && !option.action.deploymentAvailable) continue;
    if (sourceOf(option) !== cardId) continue;
    // Only target variants share a menu entry. Distinct untargeted options keep
    // their opaque identity, even when their presentation happens to match.
    const key = targetOf(option)
      ? JSON.stringify([
          option.kind,
          option.action,
          option.piloting,
          option.smuggle,
          option.plot?.useOtherResources,
          option.mode,
        ])
      : option.id;
    const group = groups.get(key);
    if (group) group.options.push(option);
    else groups.set(key, { key, option, options: [option] });
  }
  return [...groups.values()];
}
export function activeAction(view: GameView, interaction: BoardInteraction) {
  const state = currentInteraction(view, interaction);
  return state.source
    ? cardActions(view.decision, state.source).find(a => a.key === state.action)
    : undefined;
}
export function activateCardAction(
  view: GameView,
  interaction: BoardInteraction,
  action: CardAction,
): CardPress {
  const current = currentInteraction(view, interaction);
  const source = sourceOf(action.option);
  const actual = source && cardActions(view.decision, source).find(a => a.key === action.key);
  if (!actual) return { kind: 'none' };
  if (actual.options.every(o => targetOf(o)))
    return {
      kind: 'interaction',
      interaction: { ...current, source, action: actual.key, target: null },
    };
  return { kind: 'submit', optionId: actual.option.id, selections: current.selections };
}
export function selectionValid(decision: VisibleDecision, selections: string[]) {
  const selection = decision.selection;
  if (!selection) return selections.length === 0;
  if (
    selections.length < selection.min ||
    selections.length > selection.max ||
    selections.some(id => !selection.cards.includes(id))
  )
    return false;
  if (selection.allocation) {
    if (
      selections.some(id => {
        const amount = selections.filter(c => c === id).length;
        return (
          amount > (selection.allocation!.limits[id] ?? 0) ||
          amount % (selection.allocation!.quantum ?? 1) !== 0
        );
      })
    )
      return false;
  } else if (new Set(selections).size !== selections.length) return false;
  if (
    selection.budget &&
    selections.reduce((n, id) => n + (selection.budget!.costs[id] ?? Infinity), 0) >
      selection.budget.max
  )
    return false;
  return disclosureComplete(selection.disclose, selections);
}
export function changeSelection(
  view: GameView,
  interaction: BoardInteraction,
  id: string,
  remove = false,
): BoardInteraction {
  const state = currentInteraction(view, interaction),
    selection = view.decision?.selection;
  if (!selection?.cards.includes(id)) return state;
  let selections = state.selections;
  if (selection.allocation) {
    const quantum = selection.allocation.quantum ?? 1;
    const count = selections.filter(c => c === id).length;
    if (remove) {
      let remaining = quantum;
      selections = selections.filter(c => c !== id || remaining-- <= 0);
    } else if (
      count + quantum <= (selection.allocation.limits[id] ?? 0) &&
      selections.length + quantum <= selection.max
    )
      selections = [...selections, ...Array.from({ length: quantum }, () => id)];
  } else if (selections.includes(id)) selections = selections.filter(c => c !== id);
  else if (!remove && selection.max === 1) selections = [id];
  else if (!remove && selections.length < selection.max) selections = [...selections, id];
  return { ...state, selections };
}
export function pressCard(
  view: GameView,
  interaction: BoardInteraction,
  id: string,
  pending: boolean,
): CardPress {
  if (pending) return { kind: 'none' };
  const state = currentInteraction(view, interaction),
    decision = view.decision;
  if (inlineTokenChoice(view)?.cardIds.has(id)) return { kind: 'none' };
  const visible =
    view.cards.find(c => c.id === id) ?? decision?.inspectedCards.find(c => c.id === id);
  if (!visible) return { kind: 'none' };
  if (decision?.selection?.cards.includes(id))
    return { kind: 'interaction', interaction: changeSelection(view, state, id) };
  const action = activeAction(view, state);
  if (action) {
    const options = action.options.filter(o => targetOf(o) === id);
    if (options.length === 1)
      return { kind: 'submit', optionId: options[0]!.id, selections: state.selections };
    if (options.length > 1) return { kind: 'interaction', interaction: { ...state, target: id } };
    if (state.source === id)
      return {
        kind: 'interaction',
        interaction: { ...state, source: null, action: null, target: null },
      };
  }
  const direct = decision?.options.filter(o => directTargetOf(o) === id) ?? [];
  if (direct.length === 1)
    return { kind: 'submit', optionId: direct[0]!.id, selections: state.selections };
  const actions = cardActions(decision ?? null, id);
  if (actions.length === 1) return activateCardAction(view, state, actions[0]!);
  if (actions.length > 1)
    return {
      kind: 'interaction',
      interaction: { ...state, source: id, action: null, target: null },
    };
  return { kind: 'none' };
}

/** Keep targeting on the table when every choice is already visible there. */
export function isBoardTargetChoice(view: GameView): boolean {
  const d = view.decision;
  if (!d || (d.kind !== 'effect' && d.kind !== 'replacement')) return false;
  if (inlineTokenChoice(view)) return false;
  const ids = [
    ...(d.selection?.cards ?? []),
    ...d.options.flatMap(o => (directTargetOf(o) ? [directTargetOf(o)!] : [])),
  ];
  return (
    ids.length > 0 &&
    ids.every(id =>
      view.cards.some(
        c =>
          c.id === id &&
          ['ground', 'space', 'base', 'resources'].includes(c.zone) &&
          c.face?.cardId !== 'credit' &&
          !(!c.face && d.inspectedCards.some(inspected => inspected.id === id)),
      ),
    )
  );
}
export function actionableCards(view: GameView, interaction: BoardInteraction): string[] {
  if (!view.decision) return [];
  const action = activeAction(view, interaction);
  if (action) return [...new Set(action.options.flatMap(o => (targetOf(o) ? [targetOf(o)!] : [])))];
  const inline = inlineTokenChoice(view);
  return [
    ...new Set([
      ...(view.decision.selection?.cards ?? []).filter(id => !inline?.cardIds.has(id)),
      ...view.decision.options
        .filter(o => !o.action?.deploymentOnly || o.action.deploymentAvailable)
        .filter(o => !inline?.optionIds.has(o.id))
        .flatMap(o =>
          sourceOf(o) ? [sourceOf(o)!] : directTargetOf(o) ? [directTargetOf(o)!] : [],
        ),
    ]),
  ];
}
