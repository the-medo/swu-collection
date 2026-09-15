import type { VisibleDecision } from './types.ts';
export function disclosureComplete(
  requirement: NonNullable<VisibleDecision['selection']>['disclose'],
  selected: readonly string[],
): boolean {
  if (!requirement) return true;
  const counts = new Map<string, number>();
  for (const id of selected)
    for (const icon of requirement.icons[id] ?? []) counts.set(icon, (counts.get(icon) ?? 0) + 1);
  for (const icon of requirement.required) counts.set(icon, (counts.get(icon) ?? 0) - 1);
  return [...counts.values()].every(n => n >= 0);
}
