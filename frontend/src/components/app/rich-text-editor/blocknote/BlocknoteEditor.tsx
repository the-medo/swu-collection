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
  SideMenuController,
} from '@blocknote/react';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/shadcn';
import { closeHistory } from '@tiptap/pm/history';
import './blocknote.css';
import { useInsertionPicker } from '../shared/insertionContext.ts';
import { isInlineInsertion, type InsertKind } from '../shared/model.ts';
import { useTheme } from '@/components/theme-provider.tsx';
import { EditorSurface } from '../shared/EditorSurface.tsx';
import { schema } from './schema.tsx';
import { commentsSchema, simpleSchema } from './commentsSchema.ts';
import { EditorCommandMenu } from './EditorCommandMenu.tsx';
import { commandsForEditor } from '../shared/commands.ts';
import { EditorCommandIcon } from '../shared/EditorCommandIcon.tsx';
import { EditorSideMenu } from './EditorSideMenu.tsx';
import { handleToggleKeyDown } from './handleToggleKeyDown.ts';

type EditorProps = {
  type: EditorType;
  initialContent: PostDocument;
  onChange: (document: PostDocument) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

function RichEditorBody({ initialContent, onChange, disabled = false, ariaLabel }: EditorProps) {
  const request = useInsertionPicker();
  const { theme } = useTheme();
  const editor = useCreateBlockNote<{
    schema: typeof schema;
    domAttributes: { editor: Record<string, string> };
    initialContent: (typeof schema.PartialBlock)[];
  }>({
    schema,
    domAttributes: { editor: ariaLabel ? { 'aria-label': ariaLabel } : {} },
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
      if (value.kind !== 'image' && isInlineInsertion(value)) {
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
            value.kind === 'image'
              ? { type: 'image', props: value.props }
              : { type: 'swuBlock', props: { data: JSON.stringify(value) } },
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
        sideMenu={false}
        formattingToolbar={!disabled}
        theme={theme === 'system' ? undefined : theme}
      >
        <SideMenuController sideMenu={EditorSideMenu} />
        <SuggestionMenuController
          triggerCharacter="/"
          suggestionMenuComponent={EditorCommandMenu}
          getItems={async query =>
            filterSuggestionItems(
              [
                ...commandsForEditor('rich').map(command => ({
                  title: command.label,
                  subtext: command.description,
                  icon: <EditorCommandIcon kind={command.id} />,
                  aliases: command.aliases,
                  group: 'SWUBASE',
                  onItemClick: () => {
                    void insert(command.id);
                  },
                })),
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

function CommentsEditorBody({
  initialContent,
  onChange,
  disabled = false,
  ariaLabel,
}: EditorProps) {
  const request = useInsertionPicker();
  const { theme } = useTheme();
  const editor = useCreateBlockNote<{
    schema: typeof commentsSchema;
    domAttributes: { editor: Record<string, string> };
    initialContent: (typeof commentsSchema.PartialBlock)[];
  }>({
    schema: commentsSchema,
    domAttributes: { editor: ariaLabel ? { 'aria-label': ariaLabel } : {} },
    initialContent: initialContent.blocks as (typeof commentsSchema.PartialBlock)[],
  });
  const insert = async (kind: InsertKind, literalOnCancel = false) => {
    if (disabled || (kind !== 'mention' && kind !== 'card-link')) return;
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
        sideMenu={false}
        formattingToolbar={false}
        theme={theme === 'system' ? undefined : theme}
      >
        <SideMenuController sideMenu={EditorSideMenu} />
        <SuggestionMenuController
          triggerCharacter="/"
          suggestionMenuComponent={EditorCommandMenu}
          getItems={async query =>
            filterSuggestionItems(
              [
                ...commandsForEditor('comments').map(command => ({
                  title: command.label,
                  subtext: command.description,
                  icon: <EditorCommandIcon kind={command.id} />,
                  aliases: command.aliases,
                  group: 'SWUBASE',
                  onItemClick: () => void insert(command.id),
                })),
                ...getDefaultReactSlashMenuItems(editor),
              ],
              query,
            )
          }
        />
        {!disabled && (
          <FormattingToolbarController
            formattingToolbar={() => (
              <FormattingToolbar
                blockTypeSelectItems={blockTypeSelectItems(editor.dictionary).filter(
                  item => item.type !== 'heading' || Number(item.props?.level) >= 4,
                )}
              />
            )}
          />
        )}
      </BlockNoteView>
    </EditorSurface>
  );
}

function SimpleEditorBody({ initialContent, onChange, disabled = false, ariaLabel }: EditorProps) {
  const { theme } = useTheme();
  const editor = useCreateBlockNote({
    schema: simpleSchema,
    domAttributes: { editor: ariaLabel ? { 'aria-label': ariaLabel } : {} },
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
        sideMenu={false}
        formattingToolbar={!disabled}
        theme={theme === 'system' ? undefined : theme}
      >
        <SideMenuController sideMenu={EditorSideMenu} />
      </BlockNoteView>
    </EditorSurface>
  );
}

export default function PostEditor(props: EditorProps) {
  return (
    <div
      className="rte-page rte-editing"
      data-editor-type={props.type}
      onKeyDownCapture={handleToggleKeyDown}
    >
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
