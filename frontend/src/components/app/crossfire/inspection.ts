import type { GameView, VisibleCard } from '../../../../../play/view/types.ts';

export type InspectionCard = {
  id: string;
  face: NonNullable<VisibleCard['face']>;
  card?: VisibleCard;
  relation: string;
};

/** Follow exact visible links only; never catalog names or hidden-card identity. */
export function inspectionCards(view: GameView, selected: string | null): InspectionCard[] {
  if (!selected) return [];
  const visible = new Map(view.cards.map(card => [card.id, card]));
  const faceOf = (id: string) =>
    visible.get(id)?.face ??
    view.decision?.inspectedCards.find(card => card.id === id)?.face ??
    (view.privateDeckTop?.id === id ? view.privateDeckTop.face : undefined);
  if (!faceOf(selected)) return [];
  let root = selected;
  const parents = new Set([root]);
  while (true) {
    const card = visible.get(root);
    const parent = card?.attachedTo ?? card?.capturedBy;
    if (!parent || parents.has(parent) || !faceOf(parent)) break;
    parents.add(parent);
    root = parent;
  }
  const result: InspectionCard[] = [];
  const visited = new Set<string>();
  function add(id: string, relation?: string) {
    const face = faceOf(id);
    if (!face || visited.has(id)) return;
    visited.add(id);
    const card = visible.get(id);
    result.push({
      id,
      face,
      card,
      relation:
        relation ??
        (card?.zone === 'captured'
          ? 'Captured'
          : face.kind === 'base'
            ? 'Base'
            : face.kind === 'unit'
              ? 'Unit'
              : 'Card'),
    });
    for (const child of view.cards) {
      if (child.attachedTo === id) add(child.id, 'Upgrade');
      else if (child.capturedBy === id) add(child.id, 'Captured');
    }
  }
  add(root);
  return result;
}
