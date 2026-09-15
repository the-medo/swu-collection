/** Only opaque handles belong here. Ordering is ephemeral, scoped to this board. */
export function reconcileHand(order: string[], present: string[]): string[] {
  const remaining = new Set(present);
  const kept = order.filter(id => remaining.delete(id));
  return [...kept, ...remaining];
}

export function moveHandCard(order: string[], from: string, to: string): string[] {
  const source = order.indexOf(from),
    target = order.indexOf(to);
  if (source < 0 || target < 0 || source === target) return order;
  const next = order.filter(id => id !== from);
  next.splice(target, 0, from);
  return next;
}
