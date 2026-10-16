import { SideMenuExtension, SuggestionMenu } from '@blocknote/core/extensions';
import {
  BlockColorsItem,
  DragHandleButton,
  RemoveBlockItem,
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
  useExtensionState,
} from '@blocknote/react';
import { Columns3, GripVertical, Palette, Plus, Rows3, Trash2 } from 'lucide-react';

function InsertBlockButton() {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const suggestionMenu = useExtension(SuggestionMenu);
  const block = useExtensionState(SideMenuExtension, {
    selector: state => state?.block,
  });

  if (!block) return null;

  return (
    <Components.SideMenu.Button
      className="bn-button rte-add-block-button"
      label={editor.dictionary.side_menu.add_block_label}
      icon={<Plus size={18} />}
      // BlockNote's default handler is on the SVG, which shadcn makes pointer-inert.
      // Put it on the button so its padding and keyboard activation work as well.
      onClick={() => {
        if (!editor.isEditable) return;
        const empty = Array.isArray(block.content) && block.content.length === 0;
        const target = empty
          ? block
          : editor.insertBlocks([{ type: 'paragraph' }], block, 'after')[0];
        editor.setTextCursorPosition(target);
        suggestionMenu.openSuggestionMenu('/');
      }}
    />
  );
}

function EditorBlockMenu() {
  const Components = useComponentsContext()!;
  const { dictionary } = useBlockNoteEditor();
  return (
    <Components.Generic.Menu.Dropdown className="bn-menu-dropdown bn-drag-handle-menu rte-block-menu">
      <div className="rte-block-menu-heading">
        <GripVertical size={18} aria-hidden />
        <div>
          <strong>Block actions</strong>
          <span>Drag the handle to reorder</span>
        </div>
      </div>
      <BlockColorsItem>
        <Palette size={16} aria-hidden />
        {dictionary.drag_handle.colors_menuitem}
      </BlockColorsItem>
      <TableRowHeaderItem>
        <Rows3 size={16} aria-hidden />
        {dictionary.drag_handle.header_row_menuitem}
      </TableRowHeaderItem>
      <TableColumnHeaderItem>
        <Columns3 size={16} aria-hidden />
        {dictionary.drag_handle.header_column_menuitem}
      </TableColumnHeaderItem>
      <Components.Generic.Menu.Divider />
      <RemoveBlockItem>
        <Trash2 size={16} className="rte-block-delete-icon" aria-hidden />
        {dictionary.drag_handle.delete_menuitem}
      </RemoveBlockItem>
    </Components.Generic.Menu.Dropdown>
  );
}

export function EditorSideMenu() {
  return (
    <SideMenu>
      <InsertBlockButton />
      <DragHandleButton dragHandleMenu={EditorBlockMenu} />
    </SideMenu>
  );
}
