import { useEffect } from 'react';
import { SwuAspect } from '../../../../../../types/enums.ts';
import {
  CPBoxedGroupBy,
  CPGroupBy,
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';

// Hook: Maps keyboard shortcuts to CP store actions
export function useCPDeckKeyboardShortcuts() {
  const { filterCost, filterType, showCardsInDeck, showRemovedCards, showUnfilteredCards } =
    useCardPoolDeckDetailStore();

  const {
    // filters
    setFilterAspects,
    setFilterCost,
    setFilterType,
    // grouping
    setContentBoxesBy,
    setContentStacksBy,
    // visibility
    setShowCardsInDeck,
    setShowRemovedCards,
    setShowUnfilteredCards,
    // view / layout
    toggleDeckView,
    setFiltersExpanded,
  } = useCardPoolDeckDetailStoreActions();

  useEffect(() => {
    const aspectKeyMap: Record<string, SwuAspect | 'leaderBase' | 'reset'> = {
      // qwertu map to 6 aspects
      q: SwuAspect.VIGILANCE,
      w: SwuAspect.COMMAND,
      e: SwuAspect.AGGRESSION,
      r: SwuAspect.CUNNING,
      t: SwuAspect.HEROISM,
      u: SwuAspect.VILLAINY,
      // skip y intentionally (keyboard layouts)
      i: 'leaderBase',
      o: 'reset',
    };

    const typeKeyMap: Record<string, string | 'reset'> = {
      a: 'Ground',
      s: 'Space',
      d: 'Event',
      f: 'Upgrade',
      g: 'reset',
    } as const;

    const boxesKeyMap: Record<string, CPBoxedGroupBy> = {
      h: 'X',
      j: 'aspect',
      k: 'type',
      l: 'cost',
    };

    const stacksKeyMap: Record<string, CPGroupBy> = {
      b: 'aspect',
      n: 'type',
      m: 'cost',
    };

    const handleNumberCostToggle = (numKey: string) => {
      if (numKey === '7') {
        setFilterCost({ all: true });
        return;
      }
      const cost = Number(numKey);
      if (Number.isNaN(cost)) return;

      // Build next based on current filterCost (excluding 'all')
      const next: Record<number, true> = {};
      for (const key of Object.keys(filterCost)) {
        if (key === 'all') continue;
        const n = Number(key);
        if (!Number.isNaN(n)) next[n] = true;
      }
      if (next[cost]) {
        delete next[cost];
      } else {
        next[cost] = true;
      }
      if (Object.keys(next).length === 0) {
        setFilterCost({ all: true });
      } else {
        setFilterCost(next);
      }
    };

    const isEditableTarget = (el: EventTarget | null) => {
      const target = el as HTMLElement | null;
      if (!target) return false;
      const tag = target.tagName?.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in form fields
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();

      // Space toggles deck preview view
      if (key === ' ') {
        e.preventDefault();
        toggleDeckView();
        return;
      }

      // Escape collapses left filters
      if (key === 'escape') {
        setFiltersExpanded(false);
        return;
      }

      // Numbers 0-6 toggle cost; 7 resets cost
      if (/^[0-7]$/.test(key)) {
        handleNumberCostToggle(key);
        return;
      }

      // Aspect filters
      if (key in aspectKeyMap) {
        const mapped = aspectKeyMap[key];
        if (mapped === 'leaderBase') {
          setFilterAspects('showOnlyLeaderAndBaseAspects');
        } else if (mapped === 'reset') {
          setFilterAspects('all');
        } else {
          setFilterAspects(mapped);
        }
        return;
      }

      // Type filters (toggle within the list, g resets all)
      if (key in typeKeyMap) {
        const mapped = typeKeyMap[key];
        if (mapped === 'reset') {
          setFilterType([]);
        } else {
          const exists = filterType.includes(mapped);
          if (exists) {
            setFilterType(filterType.filter(t => t !== mapped));
          } else {
            setFilterType([...filterType, mapped]);
          }
        }
        return;
      }

      // Grouping: boxes
      if (key in boxesKeyMap) {
        setContentBoxesBy(boxesKeyMap[key]);
        return;
      }

      // Grouping: stacks
      if (key in stacksKeyMap) {
        setContentStacksBy(stacksKeyMap[key]);
        return;
      }

      // Visibility toggles in card pool
      if (key === 'x') {
        setShowCardsInDeck(!showCardsInDeck);
        return;
      }
      if (key === 'c') {
        setShowRemovedCards(!showRemovedCards);
        return;
      }
      if (key === 'v') {
        setShowUnfilteredCards(!showUnfilteredCards);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    filterCost,
    filterType,
    showCardsInDeck,
    showRemovedCards,
    showUnfilteredCards,
    setFilterAspects,
    setFilterCost,
    setFilterType,
    setContentBoxesBy,
    setContentStacksBy,
    setShowCardsInDeck,
    setShowRemovedCards,
    setShowUnfilteredCards,
    toggleDeckView,
    setFiltersExpanded,
  ]);
}

export default useCPDeckKeyboardShortcuts;
