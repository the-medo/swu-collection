import { bundledCatalog } from '../../cards/catalog.ts';
import { disclosureComplete } from '../../view/types.ts';
import type { GameView, ViewCommand, VisibleDecision } from '../../view/types.ts';

export type Option = VisibleDecision['options'][number];
type Selection = NonNullable<VisibleDecision['selection']>;
export type Candidate =
  | { kind: 'option'; option: Option }
  | { kind: 'select'; card: string; quantity: number }
  | { kind: 'finish' }
  | { kind: 'name'; cardId: string }
  | { kind: 'digit'; digit: number };

// Names are the pinned public title catalog, independent of either hidden hand.
export function makeNameChoices(catalogTitles: Readonly<Record<string, string>>): Candidate[] {
  const titles = new Set<string>();
  return Object.entries(catalogTitles)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, title]) => {
      if (titles.has(title)) return false;
      titles.add(title);
      return true;
    })
    .map(([cardId]) => ({ kind: 'name' as const, cardId }));
}
export const nameChoices = makeNameChoices(bundledCatalog.data.titles);

function cost(s: Selection, selected: readonly string[]) {
  return selected.reduce((sum, id) => sum + (s.budget?.costs[id] ?? (s.budget ? Infinity : 0)), 0);
}
export function selectionComplete(s: Selection, selected: readonly string[]): boolean {
  const q = s.allocation?.quantum ?? 1;
  return (
    selected.length >= s.min &&
    selected.length <= s.max &&
    selected.every(id => s.cards.includes(id)) &&
    (s.allocation
      ? s.cards.every(id => {
          const n = selected.filter(x => x === id).length;
          return n <= (s.allocation!.limits[id] ?? 0) && n % q === 0;
        })
      : new Set(selected).size === selected.length) &&
    cost(s, selected) <= (s.budget?.max ?? Infinity) &&
    disclosureComplete(s.disclose, selected)
  );
}

// Only the visible selection contract is used to retain choices with at least
// one legal completion. Selection order is preserved for ordered engine effects.
export function canComplete(s: Selection, selected: readonly string[]): boolean {
  if (selected.length > s.max || selected.some(id => !s.cards.includes(id))) return false;
  if (s.allocation) {
    if (s.budget || s.disclose) throw new Error('Unsupported combined allocation contract');
    const q = s.allocation.quantum ?? 1;
    let capacity = 0;
    for (const id of s.cards) {
      const n = selected.filter(x => x === id).length;
      const limit = s.allocation.limits[id] ?? 0;
      if (n > limit || n % q) return false;
      capacity += Math.floor((limit - n) / q) * q;
    }
    const needed = Math.max(0, Math.ceil((s.min - selected.length) / q) * q);
    return needed <= capacity && selected.length + needed <= s.max;
  }
  if (new Set(selected).size !== selected.length) return false;
  const budget = (s.budget?.max ?? Infinity) - cost(s, selected);
  if (budget < 0) return false;
  const remaining = s.cards.filter(id => !selected.includes(id));
  const needed = Math.max(0, s.min - selected.length);
  if (needed > remaining.length) return false;
  if (!s.disclose) {
    const cheapest = remaining
      .map(id => s.budget?.costs[id] ?? (s.budget ? Infinity : 0))
      .sort((a, b) => a - b);
    return cheapest.slice(0, needed).reduce((a, b) => a + b, 0) <= budget;
  }
  // Disclose sets are small. Bound work and fail explicitly on an unforeseen
  // contract rather than silently pruning a potentially legal action.
  let visits = 0;
  const search = (index: number, chosen: string[]): boolean => {
    if (++visits > 100_000) throw new Error('Disclosure completion search exceeded budget');
    if (selectionComplete(s, chosen)) return true;
    if (chosen.length >= s.max || cost(s, chosen) > (s.budget?.max ?? Infinity)) return false;
    const tail = remaining.slice(index);
    if (
      chosen.length + tail.length < s.min ||
      !disclosureComplete(s.disclose, [...chosen, ...tail])
    )
      return false;
    for (let i = index; i < remaining.length; i++)
      if (search(i + 1, [...chosen, remaining[i]!])) return true;
    return false;
  };
  return search(0, [...selected]);
}

export class CommandBuilder {
  option: Option | null = null;
  selected: string[] = [];
  namedCardId: string | undefined;
  digits = '';
  numberComplete = false;
  selectionDone = false;
  constructor(
    readonly view: GameView,
    readonly names = nameChoices,
  ) {
    if (!view.decision) throw new Error('Expected a visible decision');
  }
  get selection() {
    const s = this.view.decision!.selection;
    return this.option?.kind === 'decline-effect' && (s?.allocation || s?.disclose) ? null : s;
  }
  get stage(): 'option' | 'name' | 'number' | 'selection' | 'done' {
    if (!this.option) return 'option';
    if (this.view.decision!.effect === 'name-card' && !this.namedCardId) return 'name';
    if (this.view.decision!.effect === 'choose-number' && !this.numberComplete) return 'number';
    if (this.selection && !this.selectionDone) return 'selection';
    return 'done';
  }
  choices(): Candidate[] {
    if (this.stage === 'option')
      return this.view.decision!.options.flatMap(option => {
        const s = this.view.decision!.selection;
        if (
          s &&
          !(option.kind === 'decline-effect' && (s.allocation || s.disclose)) &&
          !canComplete(s, [])
        )
          return [];
        return [{ kind: 'option' as const, option }];
      });
    if (this.stage === 'name') return this.names;
    if (this.stage === 'number')
      return [
        { kind: 'finish' },
        ...Array.from({ length: 10 }, (_, digit) => digit)
          .filter(
            digit =>
              (this.digits.length > 0 || digit > 0) &&
              Number.isSafeInteger(Number(this.digits + digit)),
          )
          .map(digit => ({ kind: 'digit' as const, digit })),
      ];
    if (this.stage !== 'selection') return [];
    const s = this.selection!;
    const quantity = s.allocation?.quantum ?? 1;
    const result: Candidate[] = selectionComplete(s, this.selected) ? [{ kind: 'finish' }] : [];
    for (const card of s.cards) {
      const next = [...this.selected, ...Array.from({ length: quantity }, () => card)];
      if (canComplete(s, next)) result.push({ kind: 'select', card, quantity });
    }
    return result;
  }
  choose(candidate: Candidate) {
    // Callers index the current choices; do not accept raw commands over IPC.
    switch (candidate.kind) {
      case 'option':
        this.option = candidate.option;
        break;
      case 'name':
        this.namedCardId = candidate.cardId;
        break;
      case 'digit':
        this.digits += candidate.digit;
        break;
      case 'select':
        this.selected.push(...Array.from({ length: candidate.quantity }, () => candidate.card));
        break;
      case 'finish':
        if (this.stage === 'number') this.numberComplete = true;
        else this.selectionDone = true;
        break;
    }
  }
  command(): ViewCommand {
    if (this.stage !== 'done') throw new Error('Incomplete command');
    return {
      gameId: this.view.gameId,
      epoch: this.view.epoch,
      expectedRevision: this.view.revision,
      decisionId: this.view.decision!.id,
      optionId: this.option!.id,
      selections: this.selected,
      ...(this.namedCardId ? { namedCardId: this.namedCardId } : {}),
      ...(this.numberComplete ? { chosenNumber: Number(this.digits || '0') } : {}),
    };
  }
}
