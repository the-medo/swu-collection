import { useEffect, useRef, type ReactNode } from 'react';

function canOpenMention() {
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (!anchor) return false;
  const element = anchor instanceof Element ? anchor : anchor.parentElement;
  if (element?.closest('pre, code, [data-content-type="codeBlock"]')) return false;
  // Let email addresses and literal @ inside a word remain ordinary text.
  if (selection.isCollapsed && anchor.nodeType === Node.TEXT_NODE && selection.anchorOffset > 0)
    return /\s/.test(anchor.textContent?.charAt(selection.anchorOffset - 1) ?? '');
  return true;
}

/** Optional @ handling preserves the editor's native selection. */
export function EditorSurface({
  children,
  onMention,
}: {
  children: ReactNode;
  onMention?: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onMention) return;
    const element = surface.current;
    const onInput = (event: InputEvent) => {
      // Capture before the engine's input handler, including mobile input without keydown.
      if (
        event.data === '@' &&
        !event.isComposing &&
        event.target instanceof HTMLElement &&
        event.target.isContentEditable &&
        canOpenMention()
      ) {
        event.preventDefault();
        event.stopPropagation();
        onMention();
      }
    };
    element?.addEventListener('beforeinput', onInput, true);
    return () => element?.removeEventListener('beforeinput', onInput, true);
  }, [onMention]);
  return (
    <div
      ref={surface}
      className="rte-surface"
      onKeyDownCapture={event => {
        if (
          onMention &&
          event.key === '@' &&
          !event.nativeEvent.isComposing &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.target instanceof HTMLElement &&
          event.target.isContentEditable &&
          canOpenMention()
        ) {
          event.preventDefault();
          event.stopPropagation();
          onMention();
        }
      }}
    >
      {children}
    </div>
  );
}
