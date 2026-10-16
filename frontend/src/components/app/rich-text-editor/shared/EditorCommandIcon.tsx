import { editorCommands } from './commands.ts';
import type { InsertKind } from './model.ts';

export function EditorCommandIcon({
  kind,
  className = 'size-4',
}: {
  kind: InsertKind;
  className?: string;
}) {
  const Icon = editorCommands[kind].icon;
  return <Icon className={className} aria-hidden="true" />;
}
