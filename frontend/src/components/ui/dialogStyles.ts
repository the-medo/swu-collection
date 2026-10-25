// Shared Tailwind utilities for this feature. Marker classes scope contextual states.
export const dialogStyles = {
  root: 'app-dialog [--dialog-soft:#f1f5ed] [--dialog-accent:#326149] dark:[--dialog-soft:#1d2720] dark:[--dialog-accent:#b9d4a8]',
  header: [
    'app-dialog-header shrink-0 max-h-[50dvh] overflow-y-auto overscroll-contain pt-6 pr-15 pb-6 pl-6 border-b',
    'border-b-border bg-[var(--dialog-soft)] [&>p]:m-0 [&>p]:text-[length:13px] [&>p]:leading-[1.6]! max-phone:pt-5',
    'max-phone:pr-13 max-phone:pb-5 max-phone:pl-5',
  ].join(' '),
  body: 'app-dialog-body p-6 overscroll-contain max-phone:p-5',
  footer:
    'app-dialog-footer shrink-0 py-4 px-6 border-t border-t-border max-phone:py-4 max-phone:px-5',
  form: 'dialog-form flex flex-col gap-5 min-w-0 [&_input]:rounded-[10px] [&_textarea]:rounded-[10px] [&_button[role=combobox]]:rounded-[10px] [&_textarea]:min-h-22',
  formActions:
    'dialog-form-actions flex flex-wrap justify-end gap-2 pt-5 border-t border-t-border [&>button]:min-w-27 [&>button]:rounded-[10px] max-phone:[&>button]:flex-1',
  option: [
    'dialog-option flex items-start gap-3 border border-border rounded-xl p-3.5 cursor-pointer',
    '[&:has([data-state=checked])]:bg-[var(--dialog-soft,hsl(var(--muted)))] [&>button]:shrink-0 [&>button]:mt-0.5',
  ].join(' '),
  choiceTabs:
    'dialog-choice-tabs h-auto gap-1 rounded-xl p-1 mb-5 bg-[var(--dialog-soft)] [&>button]:rounded-[9px] [&>button]:p-2.5',
  cardChoices: [
    'dialog-card-choices grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3 [&>button]:min-w-0',
    '[&>button]:h-auto [&>button]:justify-start [&>button]:gap-3 [&>button]:p-3.5 [&>button]:rounded-xl',
    '[&>button]:whitespace-normal [&>button]:text-left',
  ].join(' '),
  visibility: [
    'dialog-visibility grid grid-cols-3 gap-1 border border-border rounded-xl p-1 [&>button]:px-2',
    '[&>button]:rounded-lg [&>button[data-state=on]]:bg-[var(--dialog-soft)]',
    '[&>button[data-state=on]]:text-[color:var(--dialog-accent)]',
  ].join(' '),
  // Override the existing unlayered heading rules in typography.css.
  title:
    'dialog-title m-0! p-0! border-0! text-[length:24px]! font-[650]! leading-[1.25]! tracking-[-0.035em]! wrap-anywhere',
} as const;
