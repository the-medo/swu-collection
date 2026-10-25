export const workspaceTheme = [
  'workspace-theme [--primary:149_32%_29%] [--primary-foreground:0_0%_100%] [--ring:149_32%_29%]',
  '[--workspace-accent:#326149] [--workspace-soft:#eef2e9] [--workspace-border:#d9e1d2]',
  'dark:[--primary:97_34%_75%] dark:[--primary-foreground:164_39%_15%] dark:[--ring:97_34%_75%]',
  'dark:[--workspace-accent:#b9d4a8] dark:[--workspace-soft:#1d2720] dark:[--workspace-border:#364437]',
].join(' ');

// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const workspaceStyles = {
  theme: `${workspaceTheme} min-w-0`,
  // Override the existing unlayered heading rules in typography.css.
  title:
    'workspace-title m-0! p-0! border-0! text-[length:1.375rem]! font-[650]! leading-[1.35]! tracking-[-0.035em]!',
  heading:
    'workspace-heading m-0! p-0! border-0! text-[length:0.875rem]! font-semibold! leading-[1.5]!',
  panel:
    'workspace-panel min-w-0 border border-[color:var(--workspace-border)] rounded-xl bg-card shadow-none',
  tabs: 'workspace-tabs flex gap-1 p-1 border border-[color:var(--workspace-border)] rounded-[0.625rem] bg-[var(--workspace-soft)]',
  tab: [
    'workspace-tab inline-flex items-center justify-center gap-2 min-h-8 py-1.5 px-3 rounded-md',
    'text-[length:0.8125rem] font-medium whitespace-nowrap text-muted-foreground',
    'hover:text-[color:var(--workspace-accent)] hover:bg-card/60',
    'aria-[current=page]:text-[color:var(--workspace-accent)] aria-[current=page]:bg-card',
    'aria-[current=page]:shadow-[0_1px_3px_#00000012] focus-visible:outline-[2px]',
    'focus-visible:outline-[color:var(--workspace-accent)] focus-visible:-outline-offset-2',
  ].join(' '),
} as const;
