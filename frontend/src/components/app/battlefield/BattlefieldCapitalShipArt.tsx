import type { BattlefieldShape } from '../../../../../shared/battlefield/catalog.ts';

// Overhead hulls, all facing right. Opaque hull fills also form the shared-light mask.
export function BattlefieldCapitalShipArt({
  shape,
  paint,
  metal,
  accent,
}: {
  shape: BattlefieldShape | undefined;
  paint: string;
  metal: string;
  accent: string;
}) {
  switch (shape) {
    case 'venator':
      return (
        <>
          <path
            d="M60 0 5-7-24-30H-54L-44-12-58-10V10L-44 12-54 30H-24L5 7Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path d="M-48-27H-26L1-8-37-12Z" fill={paint} stroke="#526574" strokeWidth=".6" />
              <path d="M-26-28-7-13M-40-26-33-13" stroke={accent} strokeWidth="3" />
              <path d="M-47-20H-33M-39-13H-24" stroke="#354b5a" strokeWidth=".7" />
              <path d="M-43-12H-20V-6H-43Z" fill="#687d8b" stroke={paint} strokeWidth=".5" />
              <rect x="-39" y="-13" width="5" height="8" rx="1" fill={paint} />
              <rect x="-39" y="-13" width="3" height="8" rx=".5" fill={accent} />
              <path d="M-39-9H-34" stroke="#d7e5e8" strokeWidth=".8" />
              {[-22, -14, -6].map(x => (
                <g key={x} fill={paint} stroke="#425a6a" strokeWidth=".5">
                  <rect x={x} y="-14" width="3" height="3" />
                  <path d={'M' + (x + 1) + '-12h5'} />
                </g>
              ))}
            </g>
          ))}
          <path d="M-28-5H23L51 0 23 5H-28Z" fill={accent} stroke="#4e555b" strokeWidth=".5" />
          <path d="M-24 0H47" stroke="#283f50" strokeWidth="1.5" />
          {[-20, -12, -4, 4, 12, 20, 28].map(x => (
            <path key={x} d={'M' + x + '-4V4'} stroke="#d7c4b6" strokeWidth=".6" />
          ))}
          <path d="M-55-5H-36V5H-55Z" fill="#5b7383" stroke={paint} strokeWidth=".5" />
          <Engines ys={[-8, -4, 0, 4, 8]} paint={paint} width={8} height={2.5} />
        </>
      );
    case 'hammerhead':
      return (
        <>
          <path d="M-52-10H-19L-9-6H46V6H-9L-19 10H-52Z" fill={metal} stroke={paint} />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path d="M-44-10-27-21H-11L-15-9Z" fill={metal} stroke={paint} strokeWidth=".7" />
              <rect x="-57" y="-21" width="30" height="8" rx="2" fill={metal} stroke={paint} />
              <rect x="-57" y="-12" width="25" height="7" rx="2" fill={metal} stroke={paint} />
              <path d="M-60-17H-56M-60-8.5H-56" stroke="#85d6f4" strokeWidth="3" />
              <path d="M-47-20V-14M-44-11V-6" stroke={accent} strokeWidth="3" />
            </g>
          ))}
          <path d="M37-13H53L60-8V8L53 13H37L33 7V-7Z" fill={metal} stroke={paint} />
          <path d="M39-12V12M48-11V11" stroke={accent} strokeWidth="3" />
          <path d="M53-7H58V7H53Z" fill="#334b5b" stroke={paint} strokeWidth=".6" />
          <path d="M-20-4H28V4H-20Z" fill={paint} stroke="#6b7e86" strokeWidth=".6" />
          <path d="M-12-4V4M2-4V4M19-4V4" stroke="#657785" strokeWidth=".8" />
          <circle cx="-5" r="3" fill={accent} stroke={paint} strokeWidth=".6" />
          <path d="M21-6V-9H28M21 6V9H28" stroke={paint} strokeWidth="1" fill="none" />
        </>
      );
    case 'liberty':
      return (
        <>
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path
                d="M-42-6-49-30-28-27-8-19 12-10Z"
                fill={metal}
                stroke={paint}
                strokeWidth=".7"
              />
              <path d="M-44-26-27-23-7-16" stroke={accent} strokeWidth="2" fill="none" />
              <ellipse
                cx="-25"
                cy="-20"
                rx="8"
                ry="3"
                fill={paint}
                stroke="#6d8089"
                strokeWidth=".5"
              />
            </g>
          ))}
          <path
            d="M-54-8Q-51-24-13-20L20-14Q57-10 60 0Q57 10 20 14L-13 20Q-51 24-54 8Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          <path
            d="M-44-5Q-12-11 42 0Q-12 11-44 5Z"
            fill={paint}
            stroke="#6c808b"
            strokeWidth=".5"
          />
          {[-30, -13, 4, 20, 34].map(x => (
            <g key={x} fill={paint} stroke="#6f8087" strokeWidth=".5">
              <ellipse cx={x} cy="-10" rx="6" ry="3" />
              <ellipse cx={x} cy="10" rx="6" ry="3" />
              <path d={'M' + x + '-7V7'} fill="none" />
            </g>
          ))}
          <ellipse cx="18" rx="12" ry="5" fill={accent} stroke={paint} strokeWidth=".7" />
          <ellipse cx="25" rx="4" ry="2" fill="#284451" />
          <path d="M-38 0H1" stroke="#e6d9b6" strokeWidth=".8" strokeDasharray="2 3" />
          <Engines ys={[-9, -6, -3, 0, 3, 6, 9]} paint={paint} height={2} />
        </>
      );
    case 'nebulon-b':
      return (
        <>
          {/* The keel projects vertically on the real frigate; its top view stays slender. */}
          <path d="M-41-3H39V3H-41Z" fill={metal} stroke={paint} strokeWidth=".6" />
          <path d="M-30 0H28" stroke="#435e6c" strokeWidth="1" />
          <path d="M-57-12-48-18H-30L-24-12V12L-30 18H-48L-57 12Z" fill={metal} stroke={paint} />
          <path
            d="M27-10 34-20H43L48-13 56-10 60-5V5L56 10 48 13 43 20H34L27 10Z"
            fill={metal}
            stroke={paint}
          />
          <rect
            x="-48"
            y="-11"
            width="17"
            height="22"
            rx="2"
            fill={paint}
            stroke="#6a7e86"
            strokeWidth=".6"
          />
          <path d="M-45-10V10M-37-10V10" stroke="#566d7b" strokeWidth=".8" />
          <path d="M32-15H43V15H32Z" fill={paint} stroke="#6a7e86" strokeWidth=".7" />
          <path d="M34-7H43M34 7H43" stroke={accent} strokeWidth="3" />
          <rect
            x="46"
            y="-6"
            width="9"
            height="12"
            rx="2"
            fill={accent}
            stroke={paint}
            strokeWidth=".7"
          />
          <rect x="50" y="-3" width="6" height="6" rx="1" fill="#304b5d" />
          {[-17, -6, 5, 16].map(x => (
            <path key={x} d={'M' + x + '-3V3'} stroke={paint} strokeWidth="1.6" />
          ))}
          <path d="M-29-8H-18M-29 8H-18" stroke={paint} strokeWidth="1.2" />
          <Engines ys={[-10, -5, 0, 5, 10]} paint={paint} height={3} width={7} />
        </>
      );
    case 'mc75':
      return (
        <>
          <path
            d="M-55-8Q-53-18-37-20L-19-22 14-19Q56-19 60 0Q56 19 14 19L-19 22-37 20Q-53 18-55 8Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path
                d="M-31-19Q-22-26-10-21L10-15-10-13Z"
                fill={paint}
                stroke="#637786"
                strokeWidth=".5"
              />
              {[-28, -13, 3, 19, 32].map(x => (
                <ellipse
                  key={x}
                  cx={x}
                  cy="-12"
                  rx="6"
                  ry="3"
                  fill={paint}
                  stroke="#6e818a"
                  strokeWidth=".6"
                />
              ))}
              <path d="M-32-16-2-18 20-15" stroke={accent} strokeWidth="1.5" fill="none" />
            </g>
          ))}
          <path
            d="M-44-5Q-12-13 26-7L48 0 26 7Q-12 13-44 5Z"
            fill={paint}
            stroke="#5d7480"
            strokeWidth=".6"
          />
          <ellipse cx="9" rx="16" ry="7" fill={accent} stroke={paint} strokeWidth=".7" />
          <ellipse cx="13" rx="10" ry="4" fill={paint} />
          <ellipse cx="36" rx="9" ry="4" fill={paint} stroke="#506775" strokeWidth=".7" />
          <path d="M-37-4V4M-29-6V6M-20-7V7M-13-8V8" stroke="#566c78" strokeWidth=".8" />
          <path d="M39-4V4" stroke="#314a5a" strokeWidth="2" />
          <Engines ys={[-12, -8, -4, 0, 4, 8, 12]} paint={paint} height={2.5} />
        </>
      );
    case 'mc85':
      return (
        <>
          <path
            d="M-54-10-49-23-22-27-4-23 17-14 43-9Q58-5 60 0Q58 5 43 9L17 14-4 23-22 27-49 23-54 10Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path
                d="M-48-18-23-22-4-19 17-12-6-12-28-16Z"
                fill={paint}
                stroke="#637d88"
                strokeWidth=".6"
              />
              <ellipse
                cx="-21"
                cy="-18"
                rx="14"
                ry="4"
                fill={accent}
                stroke={paint}
                strokeWidth=".6"
              />
              <ellipse cx="-23" cy="-18" rx="9" ry="2" fill={paint} />
              <path d="M-38-21-33-14M-10-20-15-12" stroke="#425f70" strokeWidth=".8" />
              <ellipse
                cx="5"
                cy="-11"
                rx="7"
                ry="3"
                fill={paint}
                stroke="#637d88"
                strokeWidth=".6"
              />
            </g>
          ))}
          <path
            d="M-49-7Q-19-15 23-7L52 0 23 7Q-19 15-49 7Z"
            fill={paint}
            stroke="#5d7683"
            strokeWidth=".6"
          />
          <path d="M-42 0H43" stroke="#698a98" strokeWidth="1" />
          {[-35, -24, -11, 2, 15, 27].map(x => (
            <ellipse key={x} cx={x} rx="5" ry="3" fill={paint} stroke="#5b7886" strokeWidth=".6" />
          ))}
          <ellipse cx="-16" rx="12" ry="5" fill={accent} stroke={paint} strokeWidth=".6" />
          <ellipse cx="-14" rx="7" ry="2.5" fill="#3d5968" />
          <path d="M34-4 48 0 34 4" stroke="#dde1ca" strokeWidth=".7" fill="none" />
          <Engines ys={[-16, -12, -8, -4, 0, 4, 8, 12, 16]} paint={paint} height={2.5} />
        </>
      );
    case 'raider':
      return (
        <>
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path d="M-51-8-49-30-14-15 15-8Z" fill="#172734" stroke={paint} strokeWidth=".8" />
              <path d="M-46-26-45-12-15-12Z" fill="#253e50" stroke="#607888" strokeWidth=".5" />
              <path d="M-46-24-26-15M-39-21-35-12M-29-17-25-11" stroke={paint} strokeWidth=".5" />
              <path d="M-13-9 9-20 23-15 27-7Z" fill="#1a2d3c" stroke={paint} strokeWidth=".7" />
              <path d="M5-15 18-12" stroke={accent} strokeWidth="2" />
            </g>
          ))}
          <path d="M-56-9-33-12 15-8 60 0 15 8-33 12-56 9Z" fill={metal} stroke={paint} />
          <path d="M-44-4H17L45 0 17 4H-44Z" fill={paint} stroke="#3d596d" strokeWidth=".6" />
          <path d="M-26-9V9M-6-8V8M20-7V7" stroke="#405d71" strokeWidth=".7" />
          <rect
            x="-37"
            y="-5"
            width="12"
            height="10"
            rx="1.5"
            fill={accent}
            stroke={paint}
            strokeWidth=".6"
          />
          <rect x="-32" y="-3" width="7" height="6" rx="1" fill="#203b50" />
          <Engines ys={[-5, 0, 5]} paint={paint} height={2.5} width={8} />
        </>
      );
    case 'light-cruiser':
      return (
        <>
          <path
            d="M-53-15-37-23 3-18 60-9V-3H27V3H60V9L3 18-37 23-53 15Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <rect x="-57" y="-19" width="23" height="9" rx="3" fill={metal} stroke={paint} />
              <path d="M-60-14.5H-56" stroke="#83d1fb" strokeWidth="4" />
              <path
                d="M-26-18 3-14 49-7H21L-15-7Z"
                fill={paint}
                stroke="#526d80"
                strokeWidth=".6"
              />
              <path d="M-20-15 21-9" stroke={accent} strokeWidth="2" />
              {[-16, -2, 12].map(x => (
                <g key={x}>
                  <circle cx={x} cy="-12" r="2" fill={paint} stroke="#415e72" strokeWidth=".5" />
                  <path d={'M' + x + '-12h5'} stroke="#3e5c72" strokeWidth=".8" />
                </g>
              ))}
            </g>
          ))}
          <path d="M-47-6H8L20 0 8 6H-47Z" fill={paint} stroke="#506c81" strokeWidth=".6" />
          <rect x="-29" y="-5" width="12" height="10" rx="2" fill={accent} stroke={paint} />
          <path d="M-29-3H-21V3H-29" fill="#3b536b" />
          <path d="M29-3V3" stroke="#253f56" strokeWidth="2" />
          <Engines ys={[0]} paint={paint} width={10} height={6} />
        </>
      );
    case 'resurgent':
      return (
        <>
          <path
            d="M-55-32-33-30 60-3 42 0 60 3-33 30-55 32-51 16-58 13V-13L-51-16Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path
                d="M-48-28-31-26 43-6 29-5-32-17-45-17Z"
                fill={paint}
                stroke="#405769"
                strokeWidth=".5"
              />
              <path
                d="M-39-21-14-18 36-4-20-8-42-11Z"
                fill={accent}
                stroke={paint}
                strokeWidth=".5"
              />
              <path
                d="M-42-25-35-16M-26-25-19-14M-8-20 0-10M11-14 18-7"
                stroke="#344d60"
                strokeWidth=".7"
              />
              {[-35, -25, -15, -5].map(x => (
                <g key={x} fill={paint} stroke="#3e5b71" strokeWidth=".5">
                  <rect x={x} y="-15" width="3" height="3" rx=".5" />
                  <path d={'M' + x + '-13h5'} />
                </g>
              ))}
            </g>
          ))}
          <path d="M-46-7H-19L21 0-19 7H-46Z" fill={paint} stroke="#3c576d" strokeWidth=".7" />
          <path d="M-40-6H-25V6H-40Z" fill={accent} stroke={paint} strokeWidth=".5" />
          <rect
            x="-34"
            y="-12"
            width="5"
            height="24"
            rx="1"
            fill={paint}
            stroke="#3a566d"
            strokeWidth=".7"
          />
          <path d="M-32-9V9M-24 0H39" stroke="#374f62" strokeWidth=".8" />
          <path d="M-32-9H-29M-32 9H-29" stroke="#a0d4e9" strokeWidth="1" />
          <Engines ys={[-11, -6, 0, 6, 11]} paint={paint} height={3} width={8} />
        </>
      );
    case 'subjugator':
      return (
        <>
          <path
            d="M-56-9-50-19-31-23 7-24 38-19 53-10 60-4V4L53 10 38 19 7 24-31 23-50 19-56 9Z"
            fill={metal}
            stroke={paint}
            strokeWidth=".7"
          />
          {[-1, 1].map(side => (
            <g key={side} transform={'scale(1 ' + side + ')'}>
              <path
                d="M-50-13-29-18 7-20 38-15 48-8-9-10Z"
                fill={paint}
                stroke="#455f73"
                strokeWidth=".6"
              />
              <path d="M-21-21H-8V-10H-21Z" fill={accent} />
              {/* Side ion weapons appear as narrow armored housings from overhead. */}
              <path
                d="M-7-20 3-26H18L27-20 22-16H-2Z"
                fill={metal}
                stroke={paint}
                strokeWidth=".6"
              />
              <path d="M3-23H18" stroke={accent} strokeWidth="3" />
              <path d="M6-25H16" stroke="#a2cce0" strokeWidth=".8" />
              {[-35, -25, -12, 1, 17, 31].map(x => (
                <path key={x} d={'M' + x + '-17v6'} stroke="#3b566c" strokeWidth=".6" />
              ))}
              <path d="M-47-15H-24" stroke={accent} strokeWidth="2" />
            </g>
          ))}
          <path
            d="M-49-6-27-10H17L42-7 52 0 42 7 17 10H-27L-49 6Z"
            fill={paint}
            stroke="#405d70"
            strokeWidth=".6"
          />
          <path d="M-38 0H46" stroke={accent} strokeWidth="3" />
          <rect
            x="-32"
            y="-6"
            width="18"
            height="12"
            rx="2"
            fill={metal}
            stroke={paint}
            strokeWidth=".6"
          />
          <rect x="-29" y="-4" width="10" height="8" rx="1.5" fill={accent} />
          <path d="M-29-2H-19V2H-29Z" fill="#284860" />
          {[-6, 8, 24, 37].map(x => (
            <rect
              key={x}
              x={x}
              y="-6"
              width="5"
              height="12"
              rx="1"
              fill={paint}
              stroke="#415d73"
              strokeWidth=".5"
            />
          ))}
          <path d="M49-4 57 0 49 4" fill="none" stroke="#d0d3b6" strokeWidth=".8" />
          <Engines ys={[-12, -8, -4, 0, 4, 8, 12]} paint={paint} height={2.5} />
        </>
      );
    default:
      return null;
  }
}

function Engines({
  ys,
  paint,
  width = 12,
  height = 3,
}: {
  ys: number[];
  paint: string;
  width?: number;
  height?: number;
}) {
  return ys.map(y => (
    <g key={y}>
      <rect
        x="-58"
        y={y - height / 2}
        width={width}
        height={height}
        rx="1"
        fill={paint}
        stroke="#526c7c"
        strokeWidth=".5"
      />
      <path d={'M-60 ' + y + 'H-57'} stroke="#8ad6f4" strokeWidth={height * 0.75} />
    </g>
  ));
}
