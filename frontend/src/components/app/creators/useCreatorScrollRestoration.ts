import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useRouter, type ParsedLocation } from '@tanstack/react-router';

declare module '@tanstack/history' {
  interface HistoryState {
    creatorRestoreScroll?: boolean;
  }
}

// Match the public feed cache lifetime. This is transient UI state only: no
// article data or browsing history is persisted across reloads or browser tabs.
const lifetime = 30 * 60_000;
const positions = new Map<string, { key: string; top: number; savedAt: number }>();
const keyFor = (location: ParsedLocation) =>
  location.pathname.replace(/\/$/, '') +
  JSON.stringify(
    Object.entries(location.search)
      .filter(
        ([key, value]) =>
          key !== 'returnTo' &&
          value !== undefined &&
          !(key === 'page' && (value === 1 || value === '1')),
      )
      .sort(([a], [b]) => a.localeCompare(b)),
  );
const groupFor = (pathname: string) => pathname.match(/^\/creators\/([^/]+)/)?.[0] ?? pathname;
const pageFor = (location: ParsedLocation) =>
  new URLSearchParams(location.searchStr).get('page') ?? '1';
let navigation:
  | { to: string; entry: string | undefined; top: number; sameGroup: boolean; pageChanged: boolean }
  | undefined;

/** Restore the app's scroll panel after cached or asynchronously loaded lists render. */
export function useCreatorScrollRestoration(
  root: RefObject<HTMLDivElement | null>,
  ready: boolean,
) {
  const router = useRouter();
  const location = useLocation();
  const key = keyFor(location);
  const entry = location.state.__TSR_key;
  const restoreRequested = location.state.creatorRestoreScroll;
  const active =
    /^\/(content|creators)(\/|$)/.test(location.pathname) && !location.pathname.endsWith('/claim');
  const readyRef = useRef(ready);
  useLayoutEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  const retry = useRef(() => {});
  useLayoutEffect(() => {
    const element = root.current;
    const main = element?.closest('main');
    if (!active || !main || !element || !entry) return;
    // Browser back/forward uses the original history entry. Explicit return
    // links get a new entry, so only those may reuse the last matching list.
    const saved =
      positions.get(entry) ??
      (restoreRequested
        ? [...positions.values()].reverse().find(position => position.key === key)
        : undefined);
    const remembered =
      saved?.key === key && Date.now() - saved.savedAt < lifetime ? saved : undefined;
    const transition =
      navigation?.to === key && navigation.entry === entry ? navigation : undefined;
    const target = remembered?.top ?? (transition?.sameGroup ? transition.top : 0);
    const results = !remembered && transition?.pageChanged;
    let stopped = !!location.hash;
    let capture = !!location.hash;
    let timeout: number | undefined;
    // A new publication must open at its start even while its content loads.
    if (!transition?.sameGroup && !location.hash) main.scrollTop = 0;
    const restore = () => {
      if (
        stopped ||
        !readyRef.current ||
        element.querySelector('[data-creator-scroll-pending="true"]')
      )
        return;
      const anchor = results ? element.querySelector('[data-creator-results]') : null;
      const top = anchor
        ? main.scrollTop + anchor.getBoundingClientRect().top - main.getBoundingClientRect().top
        : target;
      main.scrollTop = top;
      capture = true;
      // Lazy article bodies may not yet be tall enough; retry on size changes,
      // but never move the panel after the reader starts scrolling themselves.
      if (main.scrollHeight - main.clientHeight >= top - 1) stopped = true;
      else
        timeout ??= window.setTimeout(() => {
          stopped = true;
        }, 10_000);
    };
    retry.current = restore;
    const cancel = () => {
      stopped = true;
      capture = true;
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable="true"]'))
      )
        return;
      if (['Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key))
        cancel();
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches('[data-creator-results]'))
        cancel();
    };
    const resize = new ResizeObserver(restore);
    resize.observe(element);
    const changes = new MutationObserver(restore);
    changes.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-creator-scroll-pending'],
    });
    main.addEventListener('wheel', cancel, { passive: true });
    main.addEventListener('touchstart', cancel, { passive: true });
    main.addEventListener('pointerdown', cancel, { passive: true });
    main.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onKey);
    const unsubscribe = router.subscribe('onBeforeNavigate', ({ fromLocation, toLocation }) => {
      if (!fromLocation || keyFor(fromLocation) !== key) return;
      if (capture) {
        positions.delete(entry);
        positions.set(entry, { key, top: main.scrollTop, savedAt: Date.now() });
        if (positions.size > 50) positions.delete(positions.keys().next().value!);
      }
      navigation = {
        to: keyFor(toLocation),
        entry: toLocation.state.__TSR_key,
        top: main.scrollTop,
        sameGroup: groupFor(fromLocation.pathname) === groupFor(toLocation.pathname),
        pageChanged:
          fromLocation.pathname === toLocation.pathname &&
          pageFor(fromLocation) !== pageFor(toLocation),
      };
      stopped = true;
    });
    restore();
    return () => {
      unsubscribe();
      resize.disconnect();
      changes.disconnect();
      window.clearTimeout(timeout);
      main.removeEventListener('wheel', cancel);
      main.removeEventListener('touchstart', cancel);
      main.removeEventListener('pointerdown', cancel);
      main.removeEventListener('focusin', onFocus);
      document.removeEventListener('keydown', onKey);
      retry.current = () => {};
    };
  }, [active, key, entry, restoreRequested, location.hash, root, router]);
  useLayoutEffect(() => {
    retry.current();
  }, [ready]);
}
