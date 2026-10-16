import type { DefaultReactSuggestionItem, SuggestionMenuProps } from '@blocknote/react';
import { components } from '@blocknote/shadcn';
import { Fragment } from 'react';
import { SquarePlus } from 'lucide-react';

export function EditorCommandMenu({
  items,
  selectedIndex,
  onItemClick,
  loadingState,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  const Menu = components.SuggestionMenu;
  return (
    <div className="rte-command-menu">
      <div className="rte-command-menu-header">
        <SquarePlus className="size-5 text-primary" aria-hidden="true" />
        <div>
          <strong>Insert content</strong>
          <span>Type to find a command</span>
        </div>
        <kbd>/</kbd>
      </div>
      <Menu.Root id="bn-suggestion-menu" className="bn-suggestion-menu">
        {items.map((item, index) => (
          <Fragment key={item.title}>
            {item.group && item.group !== items[index - 1]?.group && (
              <Menu.Label className="bn-suggestion-menu-label">{item.group}</Menu.Label>
            )}
            <Menu.Item
              className="bn-suggestion-menu-item"
              id={`bn-suggestion-menu-item-${index}`}
              item={item}
              isSelected={index === selectedIndex}
              onClick={() => onItemClick?.(item)}
            />
          </Fragment>
        ))}
        {loadingState !== 'loaded' && <Menu.Loader className="bn-suggestion-menu-loader" />}
        {loadingState === 'loaded' && items.length === 0 && (
          <Menu.EmptyItem className="bn-suggestion-menu-item">No matching commands</Menu.EmptyItem>
        )}
      </Menu.Root>
      <div className="rte-command-menu-footer" aria-hidden="true">
        <span>
          <kbd>↑↓</kbd> Navigate
        </span>
        <span>
          <kbd>↵</kbd> Insert
        </span>
        <span>
          <kbd>esc</kbd> Close
        </span>
      </div>
    </div>
  );
}
