import { useCallback, useState } from 'react';
import type { BattlefieldScene } from '../../../../../shared/types/battlefield.ts';
import { battlefieldFingerprint } from './battlefieldFingerprint';

type BattlefieldHistory = {
  scene: BattlefieldScene;
  past: BattlefieldScene[];
  future: BattlefieldScene[];
};

export function useBattlefieldHistory(initialScene: BattlefieldScene) {
  const [history, setHistory] = useState<BattlefieldHistory>(() => ({
    scene: initialScene,
    past: [],
    future: [],
  }));
  const [preview, setPreview] = useState<BattlefieldScene>();

  const commit = useCallback((next: BattlefieldScene) => {
    setHistory(current =>
      battlefieldFingerprint('', next) === battlefieldFingerprint('', current.scene)
        ? current
        : { scene: next, past: [...current.past, current.scene].slice(-50), future: [] },
    );
  }, []);
  const undo = useCallback(() => {
    setHistory(current =>
      current.past.length
        ? {
            scene: current.past[current.past.length - 1],
            past: current.past.slice(0, -1),
            future: [current.scene, ...current.future],
          }
        : current,
    );
  }, []);
  const redo = useCallback(() => {
    setHistory(current =>
      current.future.length
        ? {
            scene: current.future[0],
            past: [...current.past, current.scene],
            future: current.future.slice(1),
          }
        : current,
    );
  }, []);
  const reset = useCallback((scene: BattlefieldScene) => {
    setHistory({ scene, past: [], future: [] });
    setPreview(undefined);
  }, []);

  return {
    scene: history.scene,
    rendered: preview ?? history.scene,
    commit,
    undo,
    redo,
    reset,
    setPreview,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
