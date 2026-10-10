import {
  toSimplePostDocument,
  trimTrailingEmptyBlocks,
  type EditorType,
  type PostDocument,
} from '../../../../../../shared/posts/content.ts';
import { InsertionProvider } from '../shared/InsertionProvider.tsx';
import '../shared/editor.css';
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
} from '@blocknote/react';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/shadcn';
import { closeHistory } from '@tiptap/pm/history';
import './blocknote.css';
import { useInsertionPicker } from '../shared/insertionContext.ts';
import { editorCommands, isInlineInsertion, type InsertKind } from '../shared/model.ts';
import { useTheme } from '@/components/theme-provider.tsx';
import { EditorSurface } from '../shared/EditorSurface.tsx';
import { commentsSchema, schema, simpleSchema } from './schema.tsx';

type EditorProps = {
  type: EditorType;
  initialContent: PostDocument;
  onChange: (document: PostDocument) => void;
  disabled?: boolean;
};

function RichEditorBody({ initialContent, onChange, disabled = false }: EditorProps) {
  const request = useInsertionPicker();
  const { theme } = useTheme();
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent.blocks as (typeof schema.PartialBlock)[],
  });
  const insert = async (kind: InsertKind, literalOnCancel = false) => {
    if (disabled) return;
    const selection = editor.prosemirrorState.selection.getBookmark();
    const value = await request(kind);
    if (editor.prosemirrorView.isDestroyed) return;
    editor.transact(tr => {
      tr.setSelection(selection.resolve(tr.doc));
      if (!value) {
        if (literalOnCancel) editor.insertInlineContent('@');
        return;
      }
      closeHistory(tr);
      if (isInlineInsertion(value)) {
        const current = editor.getTextCursorPosition().block;
        if (current.content === undefined) {
          const paragraph = editor.insertBlocks([{ type: 'paragraph' }], current, 'after')[0];
          editor.setTextCursorPosition(paragraph, 'start');
        }
        editor.insertInlineContent([
          { type: 'swuInline', props: { data: JSON.stringify(value) } },
          ' ',
        ]);
      } else {
        // Insert beside the paragraph: converting an empty paragraph to a leaf
        // block can lose the inverse replacement step in ProseMirror history.
        const current = editor.getTextCursorPosition().block;
        const empty = Array.isArray(current.content) && current.content.length === 0;
        const blocks = editor.insertBlocks(
          [
            { type: 'swuBlock', props: { data: JSON.stringify(value) } },
            ...(!empty ? [{ type: 'paragraph' as const }] : []),
          ],
          current,
          empty ? 'before' : 'after',
        );
        editor.setTextCursorPosition(empty ? current : blocks[1], 'start');
      }
    });
    editor.focus();
  };
  return (
    <EditorSurface onMention={() => void insert('mention', true)}>
      <BlockNoteView
        onChange={() =>
          onChange(
            trimTrailingEmptyBlocks({
              version: 1,
              blocks: editor.document as PostDocument['blocks'],
            }),
          )
        }
        editable={!disabled}
        editor={editor}
        slashMenu={false}
        theme={theme === 'system' ? undefined : theme}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async query =>
            filterSuggestionItems(
              [
                ...editorCommands.map(command => ({
                  title: command.label,
                  subtext: command.description,
                  aliases: [command.id],
                  group: 'SWUBASE',
                  onItemClick: () => {
                    void insert(command.id);
                  },
                })),
                {
                  title: 'Mention a user',
                  subtext: 'Link to a player inside your text.',
                  aliases: ['mention', 'user'],
                  group: 'SWUBASE',
                  onItemClick: () => void insert('mention'),
                },
                ...getDefaultReactSlashMenuItems(editor),
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </EditorSurface>
  );
}

function CommentsEditorBody({ initialContent, onChange, disabled = false }: EditorProps) {
  const request = useInsertionPicker();
  const { theme } = useTheme();
  const editor = useCreateBlockNote({
    schema: commentsSchema,
    initialContent: initialContent.blocks as (typeof commentsSchema.PartialBlock)[],
  });
  const insert = async (kind: 'mention' | 'card-link', literalOnCancel = false) => {
    if (disabled) return;
    const selection = editor.prosemirrorState.selection.getBookmark();
    const value = await request(kind);
    if (editor.prosemirrorView.isDestroyed) return;
    editor.transact(tr => {
      tr.setSelection(selection.resolve(tr.doc));
      if (!value || value.kind !== kind) {
        if (literalOnCancel) editor.insertInlineContent('@');
        return;
      }
      closeHistory(tr);
      const current = editor.getTextCursorPosition().block;
      if (current.content === undefined) {
        const paragraph = editor.insertBlocks([{ type: 'paragraph' }], current, 'after')[0];
        editor.setTextCursorPosition(paragraph, 'start');
      }
      editor.insertInlineContent([
        { type: 'swuInline', props: { data: JSON.stringify(value) } },
        ' ',
      ]);
    });
    editor.focus();
  };
  return (
    <EditorSurface onMention={() => void insert('mention', true)}>
      <BlockNoteView
        onChange={() =>
          onChange(
            trimTrailingEmptyBlocks({
              version: 1,
              blocks: editor.document as PostDocument['blocks'],
            }),
          )
        }
        editable={!disabled}
        editor={editor}
        slashMenu={false}
        formattingToolbar={false}
        theme={theme === 'system' ? undefined : theme}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async query =>
            filterSuggestionItems(
              [
                {
                  title: 'Card link',
                  subtext: 'Search for a card to reference in your comment.',
                  aliases: ['card-link', 'card'],
                  group: 'SWUBASE',
                  onItemClick: () => void insert('card-link'),
                },
                {
                  title: 'Mention a user',
                  subtext: 'Link to a player inside your comment.',
                  aliases: ['mention', 'user'],
                  group: 'SWUBASE',
                  onItemClick: () => void insert('mention'),
                },
                ...getDefaultReactSlashMenuItems(editor),
              ],
              query,
            )
          }
        />
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar
              blockTypeSelectItems={blockTypeSelectItems(editor.dictionary).filter(
                item => item.type !== 'heading' || Number(item.props?.level) >= 4,
              )}
            />
          )}
        />
      </BlockNoteView>
    </EditorSurface>
  );
}

function SimpleEditorBody({ initialContent, onChange, disabled = false }: EditorProps) {
  const { theme } = useTheme();
  const editor = useCreateBlockNote({
    schema: simpleSchema,
    initialContent: toSimplePostDocument(initialContent)
      .blocks as (typeof simpleSchema.PartialBlock)[],
  });
  return (
    <EditorSurface>
      <BlockNoteView
        onChange={() =>
          onChange(
            trimTrailingEmptyBlocks({
              version: 1,
              blocks: editor.document as PostDocument['blocks'],
            }),
          )
        }
        editable={!disabled}
        editor={editor}
        theme={theme === 'system' ? undefined : theme}
      />
    </EditorSurface>
  );
}

export default function PostEditor(props: EditorProps) {
  return (
    <div className="rte-page rte-editing" data-editor-type={props.type}>
      {props.type === 'rich' || props.type === 'comments' ? (
        <InsertionProvider>
          {props.type === 'comments' ? (
            <CommentsEditorBody {...props} />
          ) : (
            <RichEditorBody {...props} />
          )}
        </InsertionProvider>
      ) : (
        <SimpleEditorBody {...props} />
      )}
    </div>
  );
}

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
    <div className="rte-page rte-published">
      <BlockNoteView
        editor={editor}
        editable={false}
        theme={theme === 'system' ? undefined : theme}
      />
    </div>
  );
}
