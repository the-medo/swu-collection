import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useTheme } from '@/components/theme-provider.tsx';
import {
  toSimplePostDocument,
  trimTrailingEmptyBlocks,
  type EditorType,
  type PostDocument,
} from '../../../../../../shared/posts/content.ts';
import { schema } from './schema.tsx';
import { handleToggleKeyDown } from './handleToggleKeyDown.ts';
import '../shared/editor.css';
import './blocknote.css';

export function PostContent({ content, type }: { content: PostDocument; type: EditorType }) {
  const { theme } = useTheme();
  const editor = useCreateBlockNote(
    {
      schema,
      trailingBlock: false,
      initialContent: trimTrailingEmptyBlocks(
        type === 'simple' ? toSimplePostDocument(content) : content,
      ).blocks as (typeof schema.PartialBlock)[],
    },
    [type],
  );
  return (
    <div className="rte-page rte-published" onKeyDownCapture={handleToggleKeyDown}>
      <BlockNoteView
        editor={editor}
        editable={false}
        // Read-only buttons render nothing, but BlockNote still mounts their toolbar shell.
        formattingToolbar={false}
        theme={theme === 'system' ? undefined : theme}
      />
    </div>
  );
}
