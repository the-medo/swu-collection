import type { CatalogContext } from '../cards/catalog.ts';
import type { CardEffect } from '../cards/definition.ts';
import { activeAbilities } from './abilities.ts';
import type { CardInstance } from './model.ts';
// A delayed trigger still resolves its committed card definition. Checkpoints
// retain an ability ID and original source role, never executable callbacks.
export function scheduledDefinition(
  state: CatalogContext,
  card: CardInstance,
  id: string | undefined,
) {
  const matches: Extract<CardEffect, { kind: 'schedule-phase-trigger' }>[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (
      'kind' in value &&
      value.kind === 'schedule-phase-trigger' &&
      'id' in value &&
      value.id === id
    )
      matches.push(value as Extract<CardEffect, { kind: 'schedule-phase-trigger' }>);
    for (const child of Object.values(value)) visit(child);
  };
  visit(activeAbilities(state, card));
  if (matches.length !== 1) throw new Error('Unknown scheduled card ability');
  return matches[0]!;
}
