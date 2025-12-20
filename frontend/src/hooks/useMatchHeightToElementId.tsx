import * as React from 'react';

export function useMatchHeightToElementId(
  sourceElementId: string,
  enabled: boolean = true,
  heightModifier = (h: number) => `${h}px`,
) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    if (!enabled) return;

    const target = document.getElementById(sourceElementId);
    const el = ref.current;

    if (!target || !el) return;

    const apply = () => {
      // Use offsetHeight for “rendered height including padding/border”
      const h = target.offsetHeight;
      el.style.height = heightModifier(h);
      // If you prefer max-height instead of fixed height:
      // el.style.maxHeight = `${h}px`;
    };

    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(target);

    // Also react to viewport changes (sometimes layout changes without resizing target immediately)
    window.addEventListener('resize', apply);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [sourceElementId, enabled, heightModifier]);

  return ref;
}
