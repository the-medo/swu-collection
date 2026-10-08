import {
  battlefieldHeight,
  battlefieldWidth,
  type BattlefieldLight,
} from '../../../../../shared/types/battlefield.ts';

type LightSlider = 'light-x' | 'light-y';

export function BattlefieldLightControls({
  light,
  onSliderStart,
  onSliderChange,
  onSliderEnd,
  onSliderCancel,
}: {
  light: BattlefieldLight;
  onSliderStart: (kind: LightSlider) => void;
  onSliderChange: (kind: LightSlider, value: number) => void;
  onSliderEnd: () => void;
  onSliderCancel: () => void;
}) {
  return (
    <aside
      aria-label="Light controls"
      className="order-4 min-w-0 border-t p-3 lg:order-none lg:col-start-2 lg:row-start-2 lg:border-t-0 lg:border-r"
    >
      <p className="text-sm font-medium">Main light</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Drag the light handle to shade every object. The handle only appears in the editor.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-1">
        {(['x', 'y'] as const).map(axis => {
          const kind = axis === 'x' ? 'light-x' : 'light-y';
          return (
            <label key={axis} className="grid gap-1.5 text-xs">
              {axis === 'x' ? 'Horizontal' : 'Vertical'} · {Math.round(light[axis])} px
              <input
                aria-label={`Light ${axis.toUpperCase()}`}
                type="range"
                min="0"
                max={axis === 'x' ? battlefieldWidth : battlefieldHeight}
                step="1"
                value={light[axis]}
                onPointerDown={() => onSliderStart(kind)}
                onChange={event => onSliderChange(kind, Number(event.target.value))}
                onPointerUp={onSliderEnd}
                onKeyDown={() => onSliderStart(kind)}
                onKeyUp={onSliderEnd}
                onBlur={onSliderEnd}
                onPointerCancel={onSliderCancel}
                className="h-6 w-full min-w-0 accent-amber-400"
              />
            </label>
          );
        })}
      </div>
    </aside>
  );
}
