import {
  battlefieldCatalog,
  battlefieldItems,
  canScaleBattlefieldItem,
  hasBattlefieldAreaPricing,
  battlefieldItemMaxScale,
  battlefieldDeathStarMaximumCost,
} from '../../../../../shared/battlefield/catalog.ts';
import { battlefieldObjectCost } from '../../../../../shared/battlefield/cost.ts';
import type { BattlefieldPlacement } from '../../../../../shared/types/battlefield.ts';
import { BattlefieldThumbnail } from './BattlefieldThumbnail';
import {
  battlefieldPlanetTextureIds,
  battlefieldPlanetTextures,
} from '../../../../../shared/battlefield/planets.ts';

export function BattlefieldSidebar({
  selected,
  onChange,
  onSliderStart,
  onSliderChange,
  onSliderEnd,
  onSliderCancel,
}: {
  selected: BattlefieldPlacement[];
  onChange: (change: (placement: BattlefieldPlacement) => BattlefieldPlacement) => void;
  onSliderStart: (kind: 'rotation' | 'scale') => void;
  onSliderChange: (kind: 'rotation' | 'scale', value: number) => void;
  onSliderEnd: () => void;
  onSliderCancel: () => void;
}) {
  const single = selected.length === 1 ? selected[0] : undefined;
  const item = single && battlefieldItems[single.itemId];
  const rotation = Math.round(selected[0]?.rotation ?? 0) % 360;
  const colorId = selected.every(p => p.colorId === selected[0]?.colorId)
    ? selected[0]?.colorId
    : 'mixed';
  return (
    <aside
      aria-label="Object controls"
      className="order-4 min-w-0 border-t p-3 lg:order-none lg:col-start-2 lg:row-start-2 lg:border-t-0 lg:border-r"
    >
      {!selected.length ? (
        <p className="text-sm text-muted-foreground">
          Select an object to change its size, rotation, or color.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-sm font-medium">
              {single
                ? (item?.name ?? 'Unavailable object')
                : `${selected.length} objects selected`}
            </p>
            {item && (
              <div className="mt-2 hidden items-center justify-center rounded-md bg-[#0c1723] p-2 lg:flex">
                <BattlefieldThumbnail
                  item={item}
                  color={battlefieldItems[single!.colorId]?.color}
                  textureId={single!.textureId}
                  className="h-20 w-full"
                />
              </div>
            )}
          </div>
          <label className="grid gap-1.5 text-xs">
            Object color
            <select
              aria-label="Object color"
              className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
              value={colorId}
              onChange={event => onChange(p => ({ ...p, colorId: event.target.value }))}
            >
              {colorId === 'mixed' && (
                <option value="mixed" disabled>
                  Mixed colors
                </option>
              )}
              {battlefieldCatalog
                .filter(i => i.kind === 'color')
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} · {i.cost.toLocaleString()}
                  </option>
                ))}
            </select>
          </label>
          {single && item?.shape === 'planet' && (
            <label className="grid gap-1.5 text-xs">
              Planet surface
              <select
                aria-label="Planet surface"
                className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
                value={single.textureId ?? 'rocky'}
                onChange={event =>
                  onChange(p => ({
                    ...p,
                    textureId: event.target.value as NonNullable<BattlefieldPlacement['textureId']>,
                  }))
                }
              >
                {battlefieldPlanetTextureIds.map(id => (
                  <option key={id} value={id}>
                    {battlefieldPlanetTextures[id].name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {single && item && canScaleBattlefieldItem(item) && (
            <label className="grid gap-1.5 text-xs">
              Size · {Math.round(single.scale * 100)}%
              <input
                aria-label="Object size"
                type="range"
                min="0.2"
                max={battlefieldItemMaxScale(item)}
                step="0.05"
                value={single.scale}
                onPointerDown={() => onSliderStart('scale')}
                onChange={event => onSliderChange('scale', Number(event.target.value))}
                onPointerUp={onSliderEnd}
                onKeyDown={() => onSliderStart('scale')}
                onKeyUp={onSliderEnd}
                onBlur={onSliderEnd}
                onPointerCancel={onSliderCancel}
                className="h-6 w-full min-w-0 accent-primary"
              />
              {hasBattlefieldAreaPricing(item) && (
                <span className="text-muted-foreground">
                  Object cost: {battlefieldObjectCost(single).toLocaleString()} credits.{' '}
                  {item.shape === 'death-star'
                    ? `Cost grows with area from ${item.cost.toLocaleString()} at 100% to ${battlefieldDeathStarMaximumCost.toLocaleString()} credits at 300%.`
                    : 'Cost grows with area: 200% size costs 4× the base price.'}{' '}
                  Below 100% still costs the base price.
                </span>
              )}
              {item.category === 'Ships' && (
                <span className="text-muted-foreground">
                  Ships can shrink to 20% of their original size. Their credit cost stays the same.
                </span>
              )}
            </label>
          )}
          <label className="grid gap-1.5 text-xs">
            Rotation · {rotation}°
            <input
              aria-label="Object rotation"
              type="range"
              min="0"
              max="359"
              step="1"
              value={rotation}
              onPointerDown={() => onSliderStart('rotation')}
              onChange={event => onSliderChange('rotation', Number(event.target.value))}
              onPointerUp={onSliderEnd}
              onKeyDown={() => onSliderStart('rotation')}
              onKeyUp={onSliderEnd}
              onBlur={onSliderEnd}
              onPointerCancel={onSliderCancel}
              className="h-6 w-full min-w-0 accent-primary"
            />
          </label>
          {selected.length > 1 && (
            <p className="col-span-2 text-xs text-muted-foreground lg:col-span-1">
              Move or rotate this selection together.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
