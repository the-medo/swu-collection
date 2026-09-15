// Query-local dependency tracking. No evaluation state is persisted or shared
// between games. A conditional effect cannot establish its own prerequisite
// through a dependency cycle (v8 §7.3.3a).
export type Evaluation = ReadonlySet<string>;
export function evaluate<T>(
  context: Evaluation | undefined,
  key: string,
  read: (next: Evaluation) => T,
): T | undefined {
  if (context?.has(key)) return undefined;
  return read(new Set([...(context ?? []), key]));
}
