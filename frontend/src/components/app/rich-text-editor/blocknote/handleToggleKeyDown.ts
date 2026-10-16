import type { KeyboardEvent } from 'react';

export function handleToggleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  // BlockNote otherwise handles Enter/Space as document edits even when its
  // native toggle button has keyboard focus.
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    !event.nativeEvent.isComposing &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey &&
    event.target instanceof HTMLButtonElement &&
    event.target.matches('.bn-toggle-button, .bn-toggle-add-block-button')
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.target.click();
  }
}
