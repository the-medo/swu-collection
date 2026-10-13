// Match the homepage's panel geometry, typography and green accents without
// changing the typography inside an author's rich text.
// Heading resets need a parent gap (rather than space-y margins) for spacing.
export const creatorTheme =
  '[--creator-accent:#326149] [--creator-soft:#eef2e9] [--creator-border:#d9e1d2] dark:[--creator-accent:#b9d4a8] dark:[--creator-soft:#1d2720] dark:[--creator-border:#364437]';
export const creatorPanel = 'min-w-0 rounded-[20px] border border-border bg-card p-5 sm:p-6';
export const creatorTitle =
  'm-0! border-0! p-0! text-[30px]! font-semibold! leading-[1.12]! tracking-[-0.045em]! break-words sm:text-[40px]!';
export const creatorHeading =
  'm-0! border-0! p-0! text-[23px]! font-semibold! leading-[1.2]! tracking-[-0.04em]! break-words';
export const creatorSubheading =
  'm-0! border-0! p-0! text-[17px]! font-semibold! leading-[1.3]! tracking-[-0.025em]! break-words';
export const creatorDescription = 'text-[13px]! leading-[1.7]! text-muted-foreground';
export const creatorLink =
  'text-[12px] font-medium text-[var(--creator-accent)] hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
export const creatorEmpty =
  'rounded-[20px] border border-border bg-card px-6 py-12 text-center text-muted-foreground';
export const creatorPagination =
  'flex items-center justify-between gap-3 border-t border-border pt-4';
