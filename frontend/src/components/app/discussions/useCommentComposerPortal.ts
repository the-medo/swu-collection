import { useCallback, useLayoutEffect, useRef } from 'react';

type SlotRef = (node: HTMLDivElement | null) => void;
type ComposerSlot = { node: HTMLDivElement | null; ref: SlotRef; apply?: SlotRef };

// Register each editor separately, retaining immediate fallback placement when
// its comment disappears. Slot refs stay stable while other drafts change.
export function useCommentComposerSlots() {
  const slots = useRef(new Map<string, ComposerSlot>());
  const slotFor = useCallback((id: string) => {
    let slot = slots.current.get(id);
    if (!slot) {
      const created: ComposerSlot = {
        node: null,
        ref: node => {
          created.node = node;
          created.apply?.(node);
        },
      };
      slots.current.set(id, created);
      slot = created;
    }
    return slot;
  }, []);
  const inlineSlotFor = useCallback((id: string) => slotFor(id).ref, [slotFor]);
  const registerInlineSlot = useCallback(
    (id: string, apply: SlotRef) => {
      const slot = slotFor(id);
      slot.apply = apply;
      apply(slot.node);
      return () => {
        if (slot.apply === apply) slot.apply = undefined;
      };
    },
    [slotFor],
  );
  return { inlineSlotFor, registerInlineSlot };
}

// Move one persistent editor to its comment. If that comment disappears during
// a refresh, move the same editor to the fallback so its draft stays available.
export function useCommentComposerPortal(host: HTMLDivElement) {
  const inline = useRef<HTMLDivElement | null>(null);
  const fallback = useRef<HTMLDivElement | null>(null);
  const move = useCallback(
    (destination: HTMLDivElement | null) => {
      if (!destination || host.parentElement === destination) return;
      const active = host.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : null;
      destination.appendChild(host);
      active?.focus({ preventScroll: true });
      if (active && destination === fallback.current) active.scrollIntoView({ block: 'nearest' });
    },
    [host],
  );
  const inlineSlot = useCallback(
    (node: HTMLDivElement | null) => {
      inline.current = node;
      move(node ?? fallback.current);
    },
    [move],
  );
  const fallbackSlot = useCallback(
    (node: HTMLDivElement | null) => {
      fallback.current = node;
      if (!inline.current) move(node);
    },
    [move],
  );
  useLayoutEffect(() => {
    move(inline.current ?? fallback.current);
  });
  return { inlineSlot, fallbackSlot };
}
