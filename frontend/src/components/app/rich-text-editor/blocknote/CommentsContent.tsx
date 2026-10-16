import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useTheme } from '@/components/theme-provider.tsx';
import {
  trimTrailingEmptyBlocks,
  type PostDocument,
} from '../../../../../../shared/posts/content.ts';
import { commentsSchema } from './commentsSchema.ts';
import { handleToggleKeyDown } from './handleToggleKeyDown.ts';
import '../shared/editor.css';
import './blocknote.css';

export function CommentsContent({ content }: { content: PostDocument }) {
  const { theme } = useTheme();
  const editor = useCreateBlockNote(
    {
      schema: commentsSchema,
      trailingBlock: false,
      initialContent: trimTrailingEmptyBlocks(content)
        .blocks as (typeof commentsSchema.PartialBlock)[],
    },
    [],
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
