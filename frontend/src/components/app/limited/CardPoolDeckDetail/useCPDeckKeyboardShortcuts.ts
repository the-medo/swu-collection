import { useEffect } from 'react';
import { SwuAspect } from '../../../../../../types/enums.ts';
import {
  CPBoxedGroupBy,
  CPGroupBy,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

// Hook: Maps keyboard shortcuts to CP store actions
// Exported key maps so UI can describe shortcuts without duplicating logic
export const CP_ASPECT_KEY_MAP: Record<string, SwuAspect | 'leaderBase' | 'reset'> = {
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

export const CP_TYPE_KEY_MAP: Record<string, string | 'reset'> = {
  a: 'Ground',
  s: 'Space',
  d: 'Event',
  f: 'Upgrade',
  g: 'reset',
} as const;

export const CP_BOXES_KEY_MAP: Record<string, CPBoxedGroupBy> = {
  h: 'X',
  j: 'aspect',
  k: 'type',
  l: 'cost',
};

export const CP_STACKS_KEY_MAP: Record<string, CPGroupBy> = {
  b: 'aspect',
  n: 'type',
  m: 'cost',
};

/**
 * Returns human readable description of keyboard shortcuts used in Card Pool Deck Detail
 */
export function getCPDeckKeybindingsInfo() {
  return {
    general: [
      { keys: ['Space'], action: 'Toggle deck view' },
      { keys: ['Escape'], action: 'Collapse Filters panel' },
    ],
    costs: [
      { keys: ['0', '1', '2', '3', '4', '5', '6'], action: 'Toggle specific cost filters' },
      { keys: ['7'], action: 'Reset cost filters to All' },
    ],
    aspects: [
      {
        keys: Object.entries(CP_ASPECT_KEY_MAP)
          .filter(([, v]) => v !== 'leaderBase' && v !== 'reset')
          .map(([k]) => k),
        action: 'Filter by aspect',
      },
      {
        keys: ['i'],
        action: 'Show only Leader & Base aspects',
      },
      {
        keys: ['o'],
        action: 'Reset aspect filter to All',
      },
    ],
    types: [
      {
        keys: ['a', 's', 'd', 'f'],
        action: 'Toggle type filter',
      },
      {
        keys: ['g'],
        action: 'Reset type filters',
      },
    ],
    grouping: {
      boxes: Object.entries(CP_BOXES_KEY_MAP).map(([k, v]) => ({
        keys: [k],
        action: `${v === 'X' ? 'X (no grouping)' : v}`,
      })),
      stacks: Object.entries(CP_STACKS_KEY_MAP).map(([k, v]) => ({
        keys: [k],
        action: `${v}`,
      })),
    },
    visibility: [
      { keys: ['x'], action: 'Toggle showing cards currently in deck' },
      { keys: ['c'], action: 'Toggle showing removed cards' },
      { keys: ['v'], action: 'Toggle showing unfiltered cards' },
    ],
    note: 'Shortcuts are disabled if the "Keyboard shortcuts" toggle is Off.',
  } as const;
}

export function useCPDeckKeyboardShortcuts() {
  const { data: cpKeyboardShortcuts } = useGetUserSetting('cpKeyboardShortcuts');

  const {
    // filters
    setFilterAspects,
    toggleCost,
    toggleType,
    // grouping
    setContentBoxesBy,
    setContentStacksBy,
    // visibility
    toggleShowCardsInDeck,
    toggleShowRemovedCards,
    toggleShowUnfilteredCards,
    // view / layout
    toggleDeckView,
    toggleFiltersExpanded,
  } = useCardPoolDeckDetailStoreActions();

  useEffect(() => {
    // Respect user setting: if disabled, do not bind shortcuts
    if (cpKeyboardShortcuts === false) {
      return;
    }
    const aspectKeyMap = CP_ASPECT_KEY_MAP;
    const typeKeyMap = CP_TYPE_KEY_MAP;
    const boxesKeyMap = CP_BOXES_KEY_MAP;
    const stacksKeyMap = CP_STACKS_KEY_MAP;

    const handleNumberCostToggle = (numKey: string) => {
      if (numKey === '7') {
        toggleCost('reset');
        return;
      }
      const cost = Number(numKey);
      if (Number.isNaN(cost)) return;
      toggleCost(cost);
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
        toggleFiltersExpanded();
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
          toggleType('reset');
        } else {
          toggleType(mapped);
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
        toggleShowCardsInDeck();
        return;
      }
      if (key === 'c') {
        toggleShowRemovedCards();
        return;
      }
      if (key === 'v') {
        toggleShowUnfilteredCards();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cpKeyboardShortcuts]);
}

export default useCPDeckKeyboardShortcuts;
