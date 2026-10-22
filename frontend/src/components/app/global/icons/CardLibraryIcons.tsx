import type { SVGProps } from 'react';

type CardLibraryIconProps = SVGProps<SVGSVGElement> & { size?: number | string };

// Hand-drawn on a 24px grid, with open silhouettes that remain clear at sidebar size.
// These marks are decorative; the surrounding link or button supplies the label.
function CardLibraryIcon({ size = 24, children, ...props }: CardLibraryIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** A fan of sleeved cards, with a simple card-back emblem. */
export function DeckIcon(props: CardLibraryIconProps) {
  return (
    <CardLibraryIcon {...props}>
      <path d="m6 18-2.5-.7a1.5 1.5 0 0 1-1.1-1.8L5.2 5a1.5 1.5 0 0 1 1.8-1.1l2 .5" />
      <path d="M9.5 20h-2A1.5 1.5 0 0 1 6 18.5v-14A1.5 1.5 0 0 1 7.5 3h8A1.5 1.5 0 0 1 17 4.5V6" />
      <rect x="10" y="6" width="11" height="15" rx="1.5" />
      <path d="m15.5 10 2.5 3.5-2.5 3.5-2.5-3.5Z" />
    </CardLibraryIcon>
  );
}

/** Six sealed booster packs in two rows, with top and bottom wrapper seams. */
export function SealedDeckIcon(props: CardLibraryIconProps) {
  return (
    <CardLibraryIcon {...props}>
      {[
        [2, 2],
        [9.75, 2],
        [17.5, 2],
        [2, 13],
        [9.75, 13],
        [17.5, 13],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M0 .5h4.5V9H0ZM0 2.5h4.5M0 7h4.5" />
        </g>
      ))}
    </CardLibraryIcon>
  );
}

/** Four portrait card pockets, like a collection laid out in a binder. */
export function CollectionIcon(props: CardLibraryIconProps) {
  return (
    <CardLibraryIcon {...props}>
      <rect x="4" y="2" width="6" height="9" rx="1.2" />
      <rect x="14" y="2" width="6" height="9" rx="1.2" />
      <rect x="4" y="13" width="6" height="9" rx="1.2" />
      <rect x="14" y="13" width="6" height="9" rx="1.2" />
    </CardLibraryIcon>
  );
}

/** A card to add to the collection, with an open corner for the plus marker. */
export function WantlistIcon(props: CardLibraryIconProps) {
  return (
    <CardLibraryIcon {...props}>
      <path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3h10A1.5 1.5 0 0 1 17 4.5V9" />
      <path d="M7.5 7h6" />
      <circle cx="17" cy="17" r="5" />
      <path d="M17 14.5v5M14.5 17h5" />
    </CardLibraryIcon>
  );
}

/** A card and its list rows, distinct from both a deck and a collection grid. */
export function CardListIcon(props: CardLibraryIconProps) {
  return (
    <CardLibraryIcon {...props}>
      <rect x="2" y="4" width="10" height="16" rx="1.5" />
      <path d="M5.5 8h3M16 6h6M16 12h6M16 18h6" />
    </CardLibraryIcon>
  );
}
