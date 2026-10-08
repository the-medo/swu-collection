import { useEffect, useMemo, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useBlocker } from '@tanstack/react-router';
import {
  Check,
  Coins,
  Copy,
  FolderPlus,
  Layers,
  Orbit,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Sun,
  Trash2,
  Undo2,
  ZoomIn,
} from 'lucide-react';
import { useBattlefieldActions, useBattlefieldEditor } from '@/api/battlefield/useBattlefield';
import {
  useBattlefieldPreset,
  useSaveBattlefieldPreset,
  useUpdateBattlefieldPreset,
} from '@/api/battlefield/useBattlefieldPresets';
import { useRole } from '@/hooks/useRole';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  battlefieldCatalog,
  battlefieldItems,
  canScaleBattlefieldItem,
  battlefieldItemMaxScale,
  type BattlefieldItem,
} from '../../../../../shared/battlefield/catalog.ts';
import {
  defaultBattlefieldScene,
  battlefieldDefaultLight,
  battlefieldObjectLimit,
  battlefieldLayerLimit,
  type Battlefield,
  type BattlefieldEditorData,
  type BattlefieldPlacement,
  type BattlefieldScene,
  type BattlefieldPreset,
  type BattlefieldFaction,
} from '../../../../../shared/types/battlefield.ts';
import { movePlacements, rotatePlacements } from '../../../../../shared/battlefield/transforms.ts';
import {
  addBattlefieldObjects,
  duplicateBattlefieldObjects,
  duplicateBattlefieldLayer,
  cloneBattlefieldScene,
} from '../../../../../shared/battlefield/editing.ts';
import { moveBattlefieldLight } from '../../../../../shared/battlefield/lighting.ts';
import { normalizeBattlefieldScene } from '../../../../../shared/battlefield/normalize.ts';
import {
  battlefieldDrawOrder,
  battlefieldLayerRows,
  bringBattlefieldSelection,
  bringBattlefieldLayer,
  createBattlefieldLayer,
  moveBattlefieldObjects,
  nestBattlefieldLayer,
  reorderBattlefieldLayer,
} from '../../../../../shared/battlefield/layers.ts';
import { BattlefieldLayers } from './BattlefieldLayers';
import { BattlefieldObjects } from './BattlefieldObjects';
import { battlefieldCost, repairBattlefieldScene } from '../../../../../shared/battlefield/cost.ts';
import { BattlefieldSidebar } from './BattlefieldSidebar';
import { BattlefieldLightControls } from './BattlefieldLightControls';
import { BattlefieldCanvas } from './BattlefieldCanvas';
import { useBattlefieldZoom } from './useBattlefieldZoom';
import { BattlefieldSlotSelect } from './BattlefieldSlotSelect';
import { BattlefieldFactions } from './BattlefieldFactions';
import type { ErrorWithStatus } from '../../../../../types/ErrorWithStatus';
const credits = (value: number) => value.toLocaleString();
type SliderKind = 'rotation' | 'scale' | 'light-x' | 'light-y';
// PostgreSQL JSONB reorders object keys; compare scene values in a fixed order.
const fingerprint = (name: string, scene: BattlefieldScene, factions: BattlefieldFaction[] = []) =>
  JSON.stringify([
    name,
    scene.width,
    scene.height,
    scene.backgroundId,
    (scene.light ?? battlefieldDefaultLight).x,
    (scene.light ?? battlefieldDefaultLight).y,
    // Include all records so repairing an invalid or duplicate layer is a change,
    // even if that layer cannot currently appear in the tree.
    [...scene.layers]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(layer => [layer.id, layer.parentId, layer.name, layer.visible]),
    [...scene.placements]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(p => [
        p.id,
        p.itemId,
        p.x,
        p.y,
        p.rotation,
        p.scale,
        p.colorId,
        p.textureId ?? 'rocky',
        p.layerId,
        p.visible,
      ]),
    battlefieldLayerRows(scene).map(entry => [entry.kind, entry.id]),
    [...factions].sort(),
  ]);

export function BattlefieldPage({
  presetId,
  presetMode,
  initialSlot,
  onClosePreset,
}: {
  presetId?: string;
  presetMode?: 'edit';
  initialSlot?: string;
  onClosePreset?: () => void;
}) {
  useEffect(() => {
    // The previous shop persisted pending purchase UUIDs. They are obsolete.
    try {
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith('swubase:battlefield:purchase:')) sessionStorage.removeItem(key);
    } catch {
      /* Storage may be unavailable; the editor needs no persistent cache. */
    }
  }, []);
  const query = useBattlefieldEditor();
  const preset = useBattlefieldPreset(presetId);
  const isAdmin = useRole()('admin');
  const editingPreset = !!presetId && presetMode === 'edit';
  const actions = useBattlefieldActions();
  const [selectedId, setSelectedId] = useState<string>();
  const [error, setError] = useState<string>();
  const data = query.data;
  const personal =
    data?.battlefields.find(b => b.id === selectedId) ??
    data?.battlefields.find(b => b.active) ??
    data?.battlefields[0];
  const imported = useMemo<Battlefield | undefined>(
    () =>
      preset.data
        ? {
            id: `preset-${preset.data.id}`,
            name: preset.data.name,
            scene: editingPreset
              ? structuredClone(preset.data.scene)
              : cloneBattlefieldScene(preset.data.scene),
            revision: 0,
            active: false,
          }
        : undefined,
    [preset.data, editingPreset],
  );
  const current = presetId ? imported : personal;
  const select = (id: string) => {
    setSelectedId(id);
    if (presetId) onClosePreset?.();
  };
  const starterPreview = defaultBattlefieldScene('00000000-0000-4000-8000-000000000000');
  const emptyPreview =
    data && data.balance >= battlefieldCost(starterPreview)
      ? starterPreview
      : defaultBattlefieldScene();
  const create = async () => {
    try {
      const created = await actions.create.mutateAsync('My Battlefield');
      setSelectedId(created.id);
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (editingPreset && !isAdmin)
    return (
      <div className="p-6" role="alert">
        <p>Only administrators can edit Battlefield presets.</p>
        <Link to="/battlefield-showcase" className="text-primary">
          Battlefield showcase
        </Link>
      </div>
    );
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-5">
      <Helmet
        title={editingPreset ? 'Edit Battlefield preset | SWUBase' : 'Battlefield | SWUBase'}
      />
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-4 sm:px-6">
        <h1 className="m-0! flex items-center gap-3 text-2xl! font-semibold! tracking-tight">
          <Orbit className="size-6 text-primary" />
          {editingPreset ? 'Edit Battlefield preset' : 'Battlefield'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {editingPreset
            ? 'Update the public preset. Users’ saved copies keep their existing layouts.'
            : 'Build your galaxy. Each Battlefield can use your full credit budget.'}
        </p>
        <Link
          to="/battlefield-showcase"
          className="ml-auto text-sm text-primary underline-offset-4 hover:underline"
        >
          Battlefield showcase
        </Link>
        {data && !current && (
          <span className="ml-auto flex items-center gap-2 text-sm tabular-nums">
            <Coins className="size-4 text-amber-500" />
            {credits(data.balance)} credits
          </span>
        )}
      </header>
      {query.isPending && (
        <div role="status" className="rounded-xl border p-10">
          Loading your Battlefield…
        </div>
      )}
      {query.isError && (
        <div role="alert" className="rounded-xl border p-6">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {presetId && preset.isPending && (
        <p role="status" className="px-6">
          Loading the preset…
        </p>
      )}
      {presetId && preset.isError && imported && (
        <p role="status" className="px-6 text-sm text-muted-foreground">
          {(preset.error as ErrorWithStatus).status === 404
            ? editingPreset
              ? 'This preset is no longer available. Your draft is still here and can be published as a new preset.'
              : 'This preset is no longer available. Your loaded draft is still here and can be saved to your slots.'
            : 'Could not refresh this preset. Your loaded draft is still here.'}
        </p>
      )}
      {presetId && preset.isError && !imported && (
        <div role="alert" className="px-6">
          <p>{preset.error.message}</p>
          <Button variant="outline" onClick={() => void preset.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {data && !current && !presetId && (
        <div className="overflow-hidden">
          <BattlefieldCanvas scene={emptyPreview} className="aspect-[4/1] w-full" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="m-0! text-lg!">Your galaxy starts here</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a fleet, choose a backdrop, and make it your profile header. Credits set the
                budget for each layout and are never spent.
              </p>
            </div>
            <Button onClick={() => void create()} disabled={actions.create.isPending}>
              <Plus className="size-4" />
              Create battlefield
            </Button>
          </div>
        </div>
      )}
      {data && current && (
        <BattlefieldWorkspace
          key={`${current.id}:${editingPreset ? 'edit' : 'copy'}`}
          data={data}
          base={current}
          imported={!!presetId}
          initialSlot={initialSlot}
          editingPreset={editingPreset}
          presetSource={preset.data}
          onSelect={select}
          onCreate={create}
          creating={actions.create.isPending}
        />
      )}
      {data && !current && !presetId && (
        <p className="text-sm text-muted-foreground">
          {data.battlefields.length} / {data.limit} Battlefield slots used.
        </p>
      )}
    </div>
  );
}

function BattlefieldWorkspace({
  data,
  base,
  onSelect,
  onCreate,
  creating,
  imported = false,
  initialSlot,
  editingPreset = false,
  presetSource,
}: {
  data: BattlefieldEditorData;
  base: Battlefield;
  onSelect: (id: string) => void;
  onCreate: () => Promise<void>;
  creating: boolean;
  imported?: boolean;
  initialSlot?: string;
  editingPreset?: boolean;
  presetSource?: BattlefieldPreset;
}) {
  const actions = useBattlefieldActions();
  const editorQuery = useBattlefieldEditor();
  const isAdmin = useRole()('admin');
  const presetAction = useSaveBattlefieldPreset();
  const presetUpdate = useUpdateBattlefieldPreset();
  const presetQuery = useBattlefieldPreset(editingPreset ? presetSource?.id : undefined);
  const [publishOpen, setPublishOpen] = useState(false);
  const [factions, setFactions] = useState<BattlefieldFaction[]>(presetSource?.factions ?? []);
  const [publishFactions, setPublishFactions] = useState<BattlefieldFaction[]>([]);
  const initialScene = normalizeBattlefieldScene(base.scene);
  const [name, setName] = useState(base.name);
  const [persistedId, setPersistedId] = useState<string | undefined>(
    imported ? undefined : base.id,
  );
  const initialDestination = editingPreset
    ? ''
    : imported
      ? initialSlot &&
        (data.battlefields.some(b => b.id === initialSlot) ||
          (initialSlot === 'new' && data.battlefields.length < data.limit))
        ? initialSlot
        : ''
      : base.id;
  const [destination, setDestination] = useState(initialDestination);
  const [revision, setRevision] = useState(
    editingPreset
      ? (presetSource?.revision ?? 0)
      : (data.battlefields.find(b => b.id === initialDestination)?.revision ?? base.revision),
  );
  const [history, setHistory] = useState({
    scene: initialScene,
    past: [] as BattlefieldScene[],
    future: [] as BattlefieldScene[],
  });
  const [saved, setSaved] = useState(
    editingPreset
      ? fingerprint(base.name, initialScene, factions)
      : imported
        ? ''
        : fingerprint(base.name, initialScene),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>();
  const [lightSelected, setLightSelected] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState(initialScene.layers[0].id);
  const [preview, setPreview] = useState<BattlefieldScene>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    kind: 'objects' | 'light';
    pointerId: number;
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    scene: BattlefieldScene;
    ids: string[];
    moved: boolean;
  } | null>(null);
  const { viewport, zoom, panning, toggleZoom, canvasWidth, pixelsPerUnit } = useBattlefieldZoom(
    canvas,
    drag,
  );
  const sliderGesture = useRef<{
    kind: SliderKind;
    base: BattlefieldScene;
    next: BattlefieldScene;
    ids: string[];
    rotation: number;
  } | null>(null);
  const scene = history.scene;
  const rendered = preview ?? scene;
  const light = rendered.light ?? battlefieldDefaultLight;
  const currentLayerId = scene.layers.some(layer => layer.id === activeLayerId)
    ? activeLayerId
    : scene.layers[0].id;
  const select = (ids: string[], layerId?: string, asLayer = false) => {
    setLightSelected(false);
    setSelected(ids);
    setSelectedLayerId(asLayer ? layerId : undefined);
    const target = layerId ?? scene.placements.find(p => ids.includes(p.id))?.layerId;
    if (target) setActiveLayerId(target);
  };
  const selectLight = () => {
    setSelected([]);
    setSelectedLayerId(undefined);
    setLightSelected(true);
  };
  const currentFingerprint = useMemo(
    () => fingerprint(name, scene, editingPreset ? factions : []),
    [name, scene, editingPreset, factions],
  );
  const dirty = currentFingerprint !== saved;
  const allowNavigation = useRef(false);
  const saving =
    actions.save.isPending || actions.createFromDraft.isPending || presetUpdate.isPending;
  const savedBattlefield = data.battlefields.find(b => b.id === persistedId);
  const latestFingerprint = useRef(currentFingerprint);
  useEffect(() => {
    latestFingerprint.current = currentFingerprint;
  }, [currentFingerprint]);
  useBlocker({
    shouldBlockFn: () => {
      if (allowNavigation.current) {
        allowNavigation.current = false;
        return false;
      }
      return dirty && !window.confirm('Leave with unsaved Battlefield changes?');
    },
    enableBeforeUnload: dirty,
  });
  const selectAll = () => select(battlefieldDrawOrder(scene, true).map(p => p.id));
  const selectedPlacements = scene.placements.filter(p => selected.includes(p.id));
  const assessment: { cost?: number; error?: string } = (() => {
    try {
      return { cost: battlefieldCost(rendered) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  })();
  const cost = assessment.cost;
  const sceneIssue = assessment.error;
  const overBudget = !editingPreset && cost !== undefined && cost > data.balance;
  const commit = (next: BattlefieldScene) => {
    setHistory(h =>
      fingerprint('', next) === fingerprint('', h.scene)
        ? h
        : {
            scene: next,
            past: [...h.past, h.scene].slice(-50),
            future: [],
          },
    );
    setNotice(undefined);
  };
  const startSlider = (kind: SliderKind) => {
    if (sliderGesture.current?.kind === kind) return;
    sliderGesture.current = {
      kind,
      base: scene,
      next: scene,
      ids: selected,
      rotation: scene.placements.find(p => selected.includes(p.id))?.rotation ?? 0,
    };
  };
  const changeSlider = (kind: SliderKind, value: number) => {
    const active = sliderGesture.current;
    const gesture = active ?? {
      base: scene,
      ids: selected,
      rotation: scene.placements.find(p => selected.includes(p.id))?.rotation ?? 0,
    };
    const next =
      kind === 'light-x' || kind === 'light-y'
        ? {
            ...gesture.base,
            light: {
              ...gesture.base.light,
              [kind === 'light-x' ? 'x' : 'y']: value,
            },
          }
        : kind === 'rotation'
          ? value === gesture.rotation
            ? gesture.base
            : {
                ...gesture.base,
                placements: rotatePlacements(
                  gesture.base.placements,
                  gesture.ids,
                  value - gesture.rotation,
                ),
              }
          : {
              ...gesture.base,
              placements: gesture.base.placements.map(p =>
                gesture.ids.includes(p.id) &&
                battlefieldItems[p.itemId] &&
                canScaleBattlefieldItem(battlefieldItems[p.itemId]!)
                  ? {
                      ...p,
                      scale: Math.max(
                        0.2,
                        Math.min(value, battlefieldItemMaxScale(battlefieldItems[p.itemId]!)),
                      ),
                    }
                  : p,
              ),
            };
    if (active) {
      active.next = next;
      setPreview(next);
    } else commit(next); // A discrete input without a pointer/keyboard gesture.
  };
  const finishSlider = () => {
    const gesture = sliderGesture.current;
    if (!gesture) return;
    sliderGesture.current = null;
    commit(gesture.next);
    setPreview(undefined);
  };
  const cancelSlider = () => {
    sliderGesture.current = null;
    setPreview(undefined);
  };
  const undo = () => {
    setHistory(h =>
      h.past.length
        ? {
            scene: h.past[h.past.length - 1],
            past: h.past.slice(0, -1),
            future: [h.scene, ...h.future],
          }
        : h,
    );
    if (!lightSelected) select([]);
  };
  const redo = () => {
    setHistory(h =>
      h.future.length
        ? { scene: h.future[0], past: [...h.past, h.scene], future: h.future.slice(1) }
        : h,
    );
    if (!lightSelected) select([]);
  };
  const changeSelected = (change: (p: BattlefieldPlacement) => BattlefieldPlacement) =>
    commit({
      ...scene,
      placements: scene.placements.map(p => (selected.includes(p.id) ? change(p) : p)),
    });
  const rotate = (degrees: number) =>
    commit({ ...scene, placements: rotatePlacements(scene.placements, selected, degrees) });
  const remove = () => {
    commit({
      ...scene,
      placements: scene.placements.filter(p => !selected.includes(p.id)),
    });
    select([]);
  };
  const add = (itemId: string, quantity = 1) => {
    try {
      const result = addBattlefieldObjects(scene, itemId, {
        quantity,
        layerId: currentLayerId,
        batchParentId:
          selectedLayerId ?? scene.layers.find(layer => layer.id === currentLayerId)!.parentId,
        anchor: selectedPlacements[0],
      });
      commit(result.scene);
      select(result.ids, result.layerId);
      setError(undefined);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const duplicateSelection = () => {
    try {
      let overlapping = false;
      if (selectedLayerId) {
        const result = duplicateBattlefieldLayer(scene, selectedLayerId);
        commit(result.scene);
        select(result.ids, result.layerId, true);
        overlapping = result.overlapping;
      } else {
        const result = duplicateBattlefieldObjects(scene, selected);
        commit(result.scene);
        select(result.ids);
        overlapping = result.overlapping;
      }
      setNotice(
        overlapping
          ? 'Copies overlap the originals because the selection spans the Battlefield. Select individual objects to reposition them.'
          : 'Selection duplicated.',
      );
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const duplicateBattlefield = async () => {
    try {
      if (!persistedId) return;
      const result = await actions.duplicate.mutateAsync(persistedId);
      // Editing during the request must not discard a newly changed draft.
      if (latestFingerprint.current === currentFingerprint) onSelect(result.id);
      else setNotice(`Created ${result.name}. Your current draft is still open.`);
      setError(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const save = async (expectedRevision = revision, confirmed = false) => {
    if (editingPreset && presetSource) {
      if (!name.trim() || sceneIssue || saving) return;
      try {
        const result = await presetUpdate.mutateAsync({
          id: presetSource.id,
          input: { name, scene, factions, revision: expectedRevision },
        });
        setRevision(result.revision);
        setName(current => (current === name ? result.name : current));
        setSaved(fingerprint(result.name, result.scene, result.factions));
        setConflict(false);
        setError(undefined);
        setNotice('Preset updated. Users’ saved copies keep their existing layouts.');
      } catch (e) {
        setError((e as Error).message);
        setConflict((e as ErrorWithStatus).status === 409);
      }
      return;
    }
    if (!destination || !name.trim() || sceneIssue || overBudget || saving) return;
    const target = data.battlefields.find(b => b.id === destination);
    if (destination !== 'new' && !target) {
      setError('Choose an available destination slot. Your draft is still here.');
      return;
    }
    if (
      target &&
      target.id !== persistedId &&
      !confirmed &&
      !window.confirm(
        `Replace “${target.name}” with this Battlefield? Its current objects and layers will be rewritten.`,
      )
    )
      return;
    try {
      const result =
        destination === 'new'
          ? await actions.createFromDraft.mutateAsync({ name, scene })
          : await actions.save.mutateAsync({
              id: destination,
              input: { name, scene, revision: expectedRevision },
            });
      setPersistedId(result.id);
      setDestination(result.id);
      setRevision(result.revision);
      setName(current => (current === name ? result.name : current));
      setSaved(fingerprint(result.name, result.scene));
      setError(undefined);
      setConflict(false);
      setNotice('Battlefield saved.');
      if ((imported || result.id !== base.id) && latestFingerprint.current === currentFingerprint) {
        allowNavigation.current = true;
        onSelect(result.id);
      }
    } catch (e) {
      setError((e as Error).message);
      setConflict(destination !== 'new' && (e as ErrorWithStatus).status === 409);
    }
  };
  const recover = async (overwrite: boolean) => {
    if (
      !window.confirm(
        editingPreset
          ? overwrite
            ? 'Replace the latest public preset with your draft? Changes from another administrator will be overwritten.'
            : 'Discard your unsaved changes and load the latest public preset?'
          : overwrite
            ? 'Replace the latest saved Battlefield with your current draft? Changes from the other tab will be overwritten.'
            : 'Discard your unsaved changes and load the latest saved Battlefield?',
      )
    )
      return;
    setRecovering(true);
    try {
      if (editingPreset) {
        const response = await presetQuery.refetch({ throwOnError: true });
        const latest = response.data;
        if (!latest) throw new Error('Preset not found. Your draft is still here.');
        if (overwrite) await save(latest.revision, true);
        else {
          setName(latest.name);
          setRevision(latest.revision);
          setFactions(latest.factions);
          setHistory({ scene: latest.scene, past: [], future: [] });
          setSaved(fingerprint(latest.name, latest.scene, latest.factions));
          select([]);
          setConflict(false);
          setError(undefined);
          setNotice('Latest preset loaded.');
        }
        return;
      }
      const result = await editorQuery.refetch({ throwOnError: true });
      const latest = result.data?.battlefields.find(b => b.id === destination);
      if (!latest) throw new Error('Battlefield not found. Your draft is still here.');
      if (overwrite) await save(latest.revision, true);
      else {
        setPersistedId(latest.id);
        setName(latest.name);
        setRevision(latest.revision);
        setHistory({ scene: latest.scene, past: [], future: [] });
        setSaved(fingerprint(latest.name, latest.scene));
        select([]);
        setConflict(false);
        setError(undefined);
        setNotice('Latest Battlefield loaded.');
        if (imported || latest.id !== base.id) {
          allowNavigation.current = true;
          onSelect(latest.id);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRecovering(false);
    }
  };
  const publishPreset = async () => {
    try {
      const result = await presetAction.mutateAsync({ name, scene, factions: publishFactions });
      setPublishOpen(false);
      setError(undefined);
      setNotice(`“${result.name}” saved as a public preset in the Battlefield showcase.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const createLayer = (
    ids: string[],
    parentId: string | null = ids.length ? currentLayerId : null,
    wrapId?: string,
  ) => {
    if (scene.layers.length >= battlefieldLayerLimit) {
      setError(`A Battlefield can contain up to ${battlefieldLayerLimit} layers.`);
      return;
    }
    const id = crypto.randomUUID();
    commit(
      createBattlefieldLayer(
        scene,
        { id, name: `Layer ${scene.layers.length + 1}`, visible: true, parentId, order: 0 },
        ids,
        wrapId,
      ),
    );
    select(ids, id, true);
  };
  const moveObjects = (
    ids: string[],
    layerId: string,
    targetId?: string,
    above = true,
    targetKind: 'object' | 'layer' = 'object',
  ) => {
    commit(moveBattlefieldObjects(scene, ids, layerId, targetId, above, targetKind));
    select(ids, layerId);
  };
  const bringSelection = (front: boolean) => {
    commit(
      selectedLayerId
        ? bringBattlefieldLayer(scene, selectedLayerId, front)
        : bringBattlefieldSelection(scene, selected, front),
    );
  };
  const canApply = (item: BattlefieldItem) =>
    item.kind !== 'color' || selectedPlacements.length > 0;
  const choose = (item: BattlefieldItem, quantity: number) => {
    if (item.kind === 'object') return add(item.id, quantity);
    if (item.kind === 'background') commit({ ...scene, backgroundId: item.id });
    if (item.kind === 'color') changeSelected(p => ({ ...p, colorId: item.id }));
    return true;
  };
  const focusCanvas = () => requestAnimationFrame(() => canvas.current?.focus());
  const point = (e: PointerEvent) => {
    const rect = canvas.current!.querySelector('svg')!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1600,
      y: ((e.clientY - rect.top) / rect.height) * 400,
    };
  };
  const startDrag = (e: PointerEvent<SVGGElement>, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const group = [id];
    const ids = e.shiftKey
      ? selected.includes(id)
        ? selected.filter(value => !group.includes(value))
        : [...new Set([...selected, ...group])]
      : selected.includes(id)
        ? selected
        : group;
    const asLayer = !e.shiftKey && selected.includes(id) && !!selectedLayerId;
    select(ids, asLayer ? selectedLayerId : undefined, asLayer);
    e.currentTarget.focus();
    if (!ids.includes(id)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    drag.current = {
      kind: 'objects',
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      x: p.x,
      y: p.y,
      scene,
      ids,
      moved: false,
    };
  };
  const startLightDrag = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectLight();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    drag.current = {
      kind: 'light',
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      x: p.x,
      y: p.y,
      scene,
      ids: [],
      moved: false,
    };
  };
  const draggedScene = (start: NonNullable<typeof drag.current>, p: { x: number; y: number }) =>
    start.kind === 'light'
      ? {
          ...start.scene,
          light: moveBattlefieldLight(start.scene.light, p.x - start.x, p.y - start.y),
        }
      : {
          ...start.scene,
          placements: movePlacements(
            start.scene.placements,
            start.ids,
            p.x - start.x,
            p.y - start.y,
          ),
        };
  const moveDrag = (e: PointerEvent) => {
    const start = drag.current;
    if (!start || e.pointerId !== start.pointerId) return;
    if (Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY) >= 4) start.moved = true;
    if (!start.moved) return;
    const p = point(e);
    setPreview(draggedScene(start, p));
  };
  const finishDrag = (e: PointerEvent, cancelled = false) => {
    const start = drag.current;
    if (!start || e.pointerId !== start.pointerId) return;
    if (!cancelled && start.moved) {
      const p = point(e);
      commit(draggedScene(start, p));
    }
    drag.current = null;
    setPreview(undefined);
  };
  const keyboard = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      select([]);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAll();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (selected.length || selectedLayerId) duplicateSelection();
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      commit(
        lightSelected
          ? { ...scene, light: moveBattlefieldLight(scene.light, dx, dy) }
          : { ...scene, placements: movePlacements(scene.placements, selected, dx, dy) },
      );
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (!lightSelected) remove();
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target as SVGElement;
      const id = target.dataset.placementId;
      if (id) {
        e.preventDefault();
        select([id]);
      }
    }
  };
  return (
    <>
      <section className="overflow-hidden" aria-label="Battlefield editor">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <Input
              aria-label="Battlefield name"
              value={name}
              maxLength={80}
              onChange={e => setName(e.target.value)}
              className="w-44"
            />
            <div
              role="status"
              aria-label="Battlefield cost"
              className={
                overBudget
                  ? 'whitespace-nowrap text-sm tabular-nums text-destructive'
                  : 'whitespace-nowrap text-sm tabular-nums'
              }
            >
              <span className="font-medium">
                {cost === undefined ? 'Cost unavailable' : 'Cost ' + credits(cost)}
              </span>
              <span className="text-muted-foreground">
                {editingPreset ? ' credits' : ' / ' + credits(data.balance) + ' credits'}
              </span>
              {overBudget && (
                <span className="ml-2 font-medium">
                  {credits((cost ?? 0) - data.balance)} over budget
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Background
              <select
                aria-label="Background"
                className="h-9 max-w-full rounded-md border bg-background px-2 text-sm text-foreground"
                value={scene.backgroundId}
                onChange={event => commit({ ...scene, backgroundId: event.target.value })}
              >
                {battlefieldCatalog
                  .filter(item => item.kind === 'background')
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {credits(item.cost)}
                    </option>
                  ))}
              </select>
            </label>
            {!editingPreset &&
              (savedBattlefield?.active ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3.5" />
                  On your profile
                </span>
              ) : (
                <Button
                  variant="outline"
                  disabled={
                    !persistedId ||
                    actions.activate.isPending ||
                    dirty ||
                    !!sceneIssue ||
                    overBudget
                  }
                  onClick={async () => {
                    try {
                      if (persistedId) await actions.activate.mutateAsync(persistedId);
                      setError(undefined);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Use on profile
                </Button>
              ))}
            {!editingPreset && (
              <BattlefieldSlotSelect
                data={data}
                value={destination}
                disabled={saving || recovering}
                onChange={value => {
                  setDestination(value);
                  setRevision(data.battlefields.find(b => b.id === value)?.revision ?? 0);
                  setConflict(false);
                  setError(undefined);
                }}
              />
            )}
            <Button
              onClick={() => void save()}
              disabled={
                (editingPreset
                  ? !dirty
                  : (!dirty && destination === persistedId) || !destination) ||
                !name.trim() ||
                !!sceneIssue ||
                overBudget ||
                saving ||
                recovering
              }
            >
              <Save className="size-4" />
              {saving ? 'Saving…' : editingPreset ? 'Update preset' : 'Save battlefield'}
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  setPublishFactions([...factions]);
                  setPublishOpen(true);
                }}
                disabled={!name.trim() || !!sceneIssue || presetAction.isPending}
              >
                {editingPreset ? 'Save as new preset' : 'Save as preset'}
              </Button>
            )}
          </div>
        </div>
        {editingPreset && (
          <div className="border-b px-4 py-3">
            <BattlefieldFactions value={factions} onChange={setFactions} />
          </div>
        )}
        {imported && !editingPreset && !persistedId && (
          <p role="status" className="border-b px-4 py-3 text-sm text-muted-foreground">
            Preset draft: choose a destination slot before saving. An occupied slot will be
            rewritten only after you confirm.
          </p>
        )}
        {overBudget && (
          <p role="alert" className="border-b px-4 py-3 text-sm text-destructive">
            Remove objects or reduce their size to bring this Battlefield within your credit budget
            before saving.
          </p>
        )}
        {sceneIssue && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 border-b p-3 text-sm text-destructive"
          >
            <span className="mr-auto">This saved layout needs repair: {sceneIssue}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                commit(repairBattlefieldScene(scene));
                select([]);
              }}
            >
              Repair layout
            </Button>
          </div>
        )}
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[330px_200px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          <BattlefieldLayers
            scene={rendered}
            selected={selected}
            activeLayerId={currentLayerId}
            selectedLayerId={selectedLayerId}
            onSelect={select}
            onChange={commit}
            onCreate={createLayer}
            onMove={moveObjects}
            onNestLayer={(id, parentId) => commit(nestBattlefieldLayer(scene, id, parentId))}
            onReorderLayer={(id, targetId, above, targetKind) =>
              commit(reorderBattlefieldLayer(scene, id, targetId, above, targetKind))
            }
          />
          <div className="order-1 border-b p-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-r">
            <BattlefieldObjects
              onChoose={choose}
              canApply={canApply}
              onClose={focusCanvas}
              cost={cost}
              budget={editingPreset ? undefined : data.balance}
            />
          </div>
          <div className="order-2 min-w-0 lg:order-none lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Undo"
                disabled={!history.past.length}
                onClick={undo}
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Redo"
                disabled={!history.future.length}
                onClick={redo}
              >
                <Redo2 className="size-4" />
              </Button>
              <span className="mx-1 h-5 border-r" />
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={!battlefieldDrawOrder(scene, true).length}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedPlacements.length && !selectedLayerId}
                onClick={() => createLayer(selected, undefined, selectedLayerId)}
              >
                <FolderPlus className="size-4" />
                Layer from selection
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={selectedLayerId ? 'Duplicate layer' : 'Duplicate selected objects'}
                title="Duplicate selection (Ctrl+D / ⌘D)"
                disabled={!selectedPlacements.length && !selectedLayerId}
                onClick={duplicateSelection}
              >
                <Copy className="size-4" />
                {selectedLayerId ? 'Duplicate layer' : 'Duplicate'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Rotate selection counterclockwise"
                disabled={!selectedPlacements.length}
                onClick={() => rotate(-15)}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Rotate selection clockwise"
                disabled={!selectedPlacements.length}
                onClick={() => rotate(15)}
              >
                <RotateCw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedPlacements.length && !selectedLayerId}
                title="Bring the selected objects or layer to the front"
                onClick={() => bringSelection(true)}
              >
                <Layers className="size-4" />
                To front
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedPlacements.length && !selectedLayerId}
                title="Send the selected objects or layer to the back"
                onClick={() => bringSelection(false)}
              >
                To back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove selection from battlefield"
                disabled={!selectedPlacements.length}
                onClick={remove}
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={lightSelected}
                onClick={() => {
                  if (lightSelected) select([]);
                  else selectLight();
                  focusCanvas();
                }}
              >
                <Sun className="size-4" />
                Lighting
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                aria-label={zoom > 1 ? 'Fit' : 'Zoom'}
                title={zoom > 1 ? 'Fit to the available space' : 'Zoom to 200%'}
                onClick={toggleZoom}
              >
                <ZoomIn className="size-4" />
                {zoom > 1 ? 'Fit' : 'Zoom'}
                <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </Button>
            </div>
            <div
              ref={viewport}
              className="aspect-[4/1] overflow-auto bg-[#0a141e]"
              style={{ cursor: panning ? 'grabbing' : undefined }}
              aria-label="Battlefield viewport"
            >
              <div
                ref={canvas}
                tabIndex={0}
                aria-label="Battlefield editing area"
                className="relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                style={{ width: canvasWidth }}
                onClick={() => select([])}
                onPointerMove={moveDrag}
                onPointerUp={e => finishDrag(e)}
                onPointerCancel={e => finishDrag(e, true)}
                onLostPointerCapture={e => finishDrag(e, true)}
                onKeyDown={keyboard}
              >
                <BattlefieldCanvas
                  scene={rendered}
                  className="block aspect-[4/1] w-full select-none"
                >
                  {battlefieldDrawOrder(rendered, true).map(p => {
                    const item = battlefieldItems[p.itemId];
                    if (!item) return null;
                    const w = (item.width ?? 80) + 12,
                      h = (item.height ?? 80) + 12;
                    // Tiny, distant ships still need a usable target at fit zoom.
                    const minimumHitSize = 24 / (p.scale * pixelsPerUnit);
                    const hitWidth = Math.max(w, minimumHitSize),
                      hitHeight = Math.max(h, minimumHitSize);
                    const minimumOutlineSize = 12 / (p.scale * pixelsPerUnit);
                    const outlineWidth = Math.max(w, minimumOutlineSize),
                      outlineHeight = Math.max(h, minimumOutlineSize);
                    return (
                      <g
                        key={p.id}
                        data-placement-id={p.id}
                        transform={
                          'translate(' +
                          p.x +
                          ' ' +
                          p.y +
                          ') rotate(' +
                          p.rotation +
                          ') scale(' +
                          p.scale +
                          ')'
                        }
                        role="button"
                        aria-label={'Select ' + item.name}
                        aria-pressed={selected.includes(p.id)}
                        tabIndex={0}
                        className={
                          'touch-none outline-none focus-visible:[&>rect[data-selection-outline]]:stroke-white ' +
                          (panning ? 'cursor-grabbing' : 'cursor-move')
                        }
                        onPointerDown={e => startDrag(e, p.id)}
                        onClick={e => e.stopPropagation()}
                      >
                        <title>{item.name}</title>
                        {item.shape === 'death-star' ? (
                          <circle
                            data-object-hit-target
                            r={Math.max((item.width ?? 80) / 2, minimumHitSize / 2)}
                            fill="transparent"
                          />
                        ) : (
                          <rect
                            data-object-hit-target
                            x={-hitWidth / 2}
                            y={-hitHeight / 2}
                            width={hitWidth}
                            height={hitHeight}
                            fill="transparent"
                          />
                        )}
                        <rect
                          data-selection-outline
                          x={-outlineWidth / 2}
                          y={-outlineHeight / 2}
                          width={outlineWidth}
                          height={outlineHeight}
                          rx="3"
                          fill="transparent"
                          pointerEvents="none"
                          stroke={selected.includes(p.id) ? '#8dd8e8' : 'transparent'}
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray={selectedPlacements.length > 1 ? '5 3' : undefined}
                        />
                      </g>
                    );
                  })}
                </BattlefieldCanvas>
                <button
                  type="button"
                  aria-label="Move main light"
                  aria-pressed={lightSelected}
                  title="Drag to move the main light"
                  data-battlefield-light={`${light.x} ${light.y}`}
                  className={
                    'absolute z-10 flex size-9 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border border-amber-200/70 bg-[#182332]/90 text-amber-200 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ' +
                    (lightSelected ? 'ring-2 ring-amber-200 ' : 'pointer-events-none opacity-60 ') +
                    (panning ? 'cursor-grabbing' : 'cursor-move')
                  }
                  style={{ left: `${light.x / 16}%`, top: `${light.y / 4}%` }}
                  onPointerDown={startLightDrag}
                  onClick={e => {
                    e.stopPropagation();
                    selectLight();
                  }}
                >
                  <Sun className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
              <span>
                Wheel to zoom · Middle button + drag to pan · Drag to move · Shift-click to select
                several · Arrow keys to nudge · Ctrl+D / ⌘D to duplicate · Delete to remove
              </span>
              <span>1600 × 400 px · {dirty ? 'Unsaved changes' : 'Saved'}</span>
              <span>
                {selectedPlacements.length ? selectedPlacements.length + ' selected · ' : ''}
                {scene.placements.length} / {battlefieldObjectLimit} objects
              </span>
            </div>
          </div>
          {lightSelected ? (
            <BattlefieldLightControls
              light={light}
              onSliderStart={startSlider}
              onSliderChange={changeSlider}
              onSliderEnd={finishSlider}
              onSliderCancel={cancelSlider}
            />
          ) : (
            <BattlefieldSidebar
              selected={rendered.placements.filter(p => selected.includes(p.id))}
              onChange={changeSelected}
              onSliderStart={startSlider}
              onSliderChange={changeSlider}
              onSliderEnd={finishSlider}
              onSliderCancel={cancelSlider}
            />
          )}
        </div>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {conflict && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <span className="mr-auto text-sm text-muted-foreground">
            Your draft is preserved. Reloading discards it; saving your draft replaces the latest
            version.
          </span>
          <Button
            variant="outline"
            disabled={recovering || saving}
            onClick={() => void recover(false)}
          >
            Reload latest
          </Button>
          <Button disabled={recovering || saving} onClick={() => void recover(true)}>
            Save my draft instead
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {!editingPreset && (
        <div className="flex flex-wrap items-center gap-3 px-4 text-sm text-muted-foreground">
          <span>
            {data.battlefields.length} / {data.limit} Battlefield slots used
          </span>
          {data.battlefields.length > 1 && (
            <select
              aria-label="Choose Battlefield"
              value={persistedId ?? ''}
              disabled={dirty || saving || actions.duplicate.isPending}
              className="rounded-md border bg-background p-2 text-foreground"
              onChange={e => onSelect(e.target.value)}
            >
              {!persistedId && <option value="">Preset draft</option>}
              {data.battlefields.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.active ? ' · on profile' : ''}
                </option>
              ))}
            </select>
          )}
          {data.battlefields.length < data.limit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onCreate()}
              disabled={dirty || saving || creating || actions.duplicate.isPending}
            >
              <Plus className="size-4" />
              New battlefield
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            aria-label="Duplicate Battlefield"
            title={
              data.battlefields.length >= data.limit
                ? `Battlefield limit reached (${data.battlefields.length} / ${data.limit}).`
                : dirty
                  ? 'Save your changes before duplicating this Battlefield.'
                  : 'Create a saved copy of this Battlefield.'
            }
            disabled={
              !persistedId ||
              dirty ||
              saving ||
              creating ||
              actions.duplicate.isPending ||
              data.battlefields.length >= data.limit
            }
            onClick={() => void duplicateBattlefield()}
          >
            <Copy className="size-4" />
            {actions.duplicate.isPending ? 'Duplicating…' : 'Duplicate Battlefield'}
          </Button>
        </div>
      )}
      <Dialog
        open={publishOpen}
        onOpenChange={open => {
          if (!presetAction.isPending) setPublishOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as a Battlefield preset?</DialogTitle>
            <DialogDescription>
              “{name.trim()}” will be displayed publicly in the Battlefield showcase. Hidden layers
              and objects are included in the public preset and its cost. Users can copy and
              customize the whole layout. Your personal Battlefield slots will stay as they are.
            </DialogDescription>
          </DialogHeader>
          <BattlefieldFactions
            value={publishFactions}
            onChange={setPublishFactions}
            disabled={presetAction.isPending}
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={presetAction.isPending}
              onClick={() => setPublishOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={presetAction.isPending} onClick={() => void publishPreset()}>
              {presetAction.isPending ? 'Publishing…' : 'Publish preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
